import JsonFile from '@expo/json-file';
import chalk from 'chalk';
import path from 'path';

import { EXPO_DIR } from '../../Constants';
import logger from '../../Logger';
import { getAvailableProjectTemplatesAsync } from '../../ProjectTemplates';
import { Task } from '../../TasksRunner';
import * as Workspace from '../../Workspace';
import { CommandOptions, Parcel, TaskArgs } from '../types';

const { green, yellow, cyan } = chalk;

/**
 * Updates versions of packages to be published in other workspace projects depending on them.
 */
export const updateWorkspaceProjects = new Task<TaskArgs>(
  {
    name: 'updateWorkspaceProjects',
    filesToStage: ['**/package.json', 'yarn.lock'],
  },
  async (parcels: Parcel[], options: CommandOptions) => {
    logger.info('\n📤 Updating workspace projects...');

    const workspaceInfo = await Workspace.getInfoAsync();

    // Append project templates as they're not yarn workspaces.
    const templates = await getAvailableProjectTemplatesAsync();
    templates.forEach((template) => {
      workspaceInfo[template.packageName] = {
        location: template.path.replace(EXPO_DIR, ''),
        workspaceDependencies: template.getDependencies().map((dep) => dep.name),
        mismatchedWorkspaceDependencies: [],
        workspacePeerDependencies: [],
        workspaceOptionalDependencies: [],
      };
    });

    const dependenciesKeys = [
      'dependencies',
      'devDependencies',
      'peerDependencies',
      'optionalDependencies',
    ];

    const parcelsObject = parcels.reduce((acc, parcel) => {
      acc[parcel.pkg.packageName] = parcel;
      return acc;
    }, {});

    await Promise.all(
      Object.entries(workspaceInfo).map(async ([projectName, projectInfo]) => {
        const projectDependencies = [
          ...projectInfo.workspaceDependencies,
          ...projectInfo.workspacePeerDependencies,
          ...projectInfo.workspaceOptionalDependencies,
          ...projectInfo.mismatchedWorkspaceDependencies,
        ]
          .map((dependencyName) => parcelsObject[dependencyName])
          .filter(Boolean);

        // If this project doesn't depend on any package we're going to publish.
        if (projectDependencies.length === 0) {
          return;
        }

        // Get copy of project's `package.json`.
        const projectPackageJsonPath = path.join(EXPO_DIR, projectInfo.location, 'package.json');
        const projectPackageJson = await JsonFile.readAsync(projectPackageJsonPath);
        const batch = logger.batch();

        batch.log('  ', green(projectName));

        // Iterate through different dependencies types.
        for (const dependenciesKey of dependenciesKeys) {
          const dependenciesObject = projectPackageJson[dependenciesKey];

          if (!dependenciesObject) {
            continue;
          }

          for (const { pkg, state } of projectDependencies) {
            const currentVersionRange = dependenciesObject[pkg.packageName];

            if (
              !shouldUpdateDependencyVersion({
                currentVersionRange,
                dependencyType: dependenciesKey,
                isCanaryRelease: options.canary,
              })
            ) {
              continue;
            }

            // Leave tilde and caret as they are, just replace the version.
            const newVersionRange = options.canary
              ? state.releaseVersion
              : currentVersionRange.replace(/([\^~]?).*/, `$1${state.releaseVersion}`);

            dependenciesObject[pkg.packageName] = newVersionRange;

            batch.log(
              '    ',
              `Updating ${yellow(`${dependenciesKey}.${pkg.packageName}`)}`,
              `from ${cyan(currentVersionRange)} to ${cyan(newVersionRange)}`
            );
          }
        }

        // Save project's `package.json`.
        await JsonFile.writeAsync(projectPackageJsonPath, projectPackageJson);

        // Flush batched logs if there is at least one version change in the project.
        if (batch.batchedLogs.length > 1) {
          batch.flush();
        }
      })
    );
  }
);

/**
 * Returns boolean indicating if the version range should be updated. We update them in most cases,
 * except for peer and optional dependencies with `*` range which are updated only for canary releases.
 *
 * @param context.currentVersionRange Current version range of the dependency
 * @param context.dependencyType What type of dependency we are updating
 * @param context.canary If this is a canary release
 */
function shouldUpdateDependencyVersion(context: {
  currentVersionRange?: string;
  dependencyType: string;
  isCanaryRelease: boolean;
}) {
  // Do not update the version if there is no current version range
  if (!context.currentVersionRange) {
    return false;
  }

  // Only update the peerDependencies & optionalDependencies, where the version is `*`, during canary releases
  // Custom versioning like `x.x.x-canary-...` are NOT included when using `*` as version
  if (
    context.currentVersionRange === '*' &&
    ['peerDependencies', 'optionalDependencies'].includes(context.dependencyType)
  ) {
    return context.isCanaryRelease;
  }
  return true;
}
