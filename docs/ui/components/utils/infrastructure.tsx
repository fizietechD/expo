import { ReactElement } from 'react';

import { markdownComponents } from '~/ui/components/Markdown';

export const ResourceClasses = { android: ['medium', 'large'], ios: ['medium', 'large'] } as const;

const AndroidResourceClassToSpec: Record<(typeof ResourceClasses.android)[number], ReactElement> = {
  medium: (
    <>
      4 vCPUs, 16 GB RAM (
      <markdownComponents.a href="https://cloud.google.com/compute/docs/general-purpose-machines#n2_machine_types">
        n2-standard-4
      </markdownComponents.a>{' '}
      or{' '}
      <markdownComponents.a href="https://cloud.google.com/compute/docs/general-purpose-machines#c3d_machine_types">
        c3d-standard-4
      </markdownComponents.a>{' '}
      (default) Google Cloud machine type, depending on the "New Android Builds Infrastructure"
      setting in project settings)
    </>
  ),
  large: (
    <>
      8 vCPUs, 32 GB RAM (
      <markdownComponents.a href="https://cloud.google.com/compute/docs/general-purpose-machines#n2_machine_types">
        n2-standard-8
      </markdownComponents.a>{' '}
      or{' '}
      <markdownComponents.a href="https://cloud.google.com/compute/docs/general-purpose-machines#c3d_machine_types">
        c3d-standard-8
      </markdownComponents.a>{' '}
      (default) Google Cloud machine type, depending on the "New Android Builds Infrastructure"
      setting in project settings)
    </>
  ),
};

const IosResourceClassToSpec: Record<(typeof ResourceClasses.ios)[number], ReactElement> = {
  medium: <>5 performance cores, 20 GiB RAM, 110 GB SSD</>,
  large: <>10 performance cores, 40 GiB RAM, 110 GB SSD</>,
};

function ResourceClassSpecLink({
  resourceClass,
  platform,
}: {
  resourceClass: string;
  platform: 'android' | 'ios';
}) {
  const platformId = platform === 'ios' ? 2 : 1;
  return (
    <markdownComponents.a href={`/eas/json/#resourceclass-${platformId}`}>
      {resourceClass}
    </markdownComponents.a>
  );
}

export function BuildResourceList({ platform }: { platform: keyof typeof ResourceClasses }) {
  const spec = platform === 'ios' ? IosResourceClassToSpec : AndroidResourceClassToSpec;
  return (
    <markdownComponents.ul>
      {ResourceClasses[platform].map(resourceClass => (
        <markdownComponents.li key={`${platform}-${resourceClass}`}>
          <markdownComponents.code>
            <ResourceClassSpecLink platform={platform} resourceClass={resourceClass} />
          </markdownComponents.code>
          : {spec[resourceClass]}
        </markdownComponents.li>
      ))}
    </markdownComponents.ul>
  );
}
