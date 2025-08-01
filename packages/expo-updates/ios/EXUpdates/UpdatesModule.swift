// Copyright 2019 650 Industries. All rights reserved.

import ExpoModulesCore

/**
 * Exported module which provides to the JS runtime information about the currently running update
 * and updates state, along with methods to check for and download new updates, reload with the
 * newest downloaded update applied, and read/clear native log entries.
 *
 * Communicates with the updates hub (AppController in most apps, EXAppLoaderExpoUpdates in
 * Expo Go and legacy standalone apps) via EXUpdatesService, an internal module which is overridden
 * by EXUpdatesBinding, a scoped module, in Expo Go.
 */
public final class UpdatesModule: Module, UpdatesEventManagerObserver {
  public func definition() -> ModuleDefinition {
    Name("ExpoUpdates")

    Events(
      EXUpdatesStateChangeEventName
    )

    Constants {
      AppController.sharedInstance.getConstantsForModule().toModuleConstantsMap()
    }

    OnStartObserving(EXUpdatesStateChangeEventName) {
      AppController.setUpdatesEventManagerObserver(self)
    }

    OnStopObserving(EXUpdatesStateChangeEventName) {
      AppController.removeUpdatesEventManagerObserver()
    }

    OnDestroy {
      AppController.removeUpdatesEventManagerObserver()
    }

    AsyncFunction("reload") { (options: ReloadScreenOptions?, promise: Promise) in
      AppController.sharedInstance.reloadScreenManager?.setConfiguration(options)
      AppController.sharedInstance.requestRelaunch {
        promise.resolve(nil)
      } error: { error in
        promise.reject(error)
      }
    }

    AsyncFunction("checkForUpdateAsync") { (promise: Promise) in
      AppController.sharedInstance.checkForUpdate { checkForUpdateResult in
        switch checkForUpdateResult {
        case .noUpdateAvailable(let reason):
          promise.resolve([
            "isAvailable": false,
            "isRollBackToEmbedded": false,
            "reason": reason.rawValue
          ])
          return
        case .updateAvailable(let manifest):
          promise.resolve([
            "isAvailable": true,
            "manifest": manifest,
            "isRollBackToEmbedded": false
          ])
          return
        case .rollBackToEmbedded:
          promise.resolve([
            "isAvailable": false,
            "isRollBackToEmbedded": true
          ])
          return
        case .error(let error):
          promise.reject("ERR_UPDATES_CHECK", error.localizedDescription)
          return
        }
      } error: { error in
        promise.reject(error)
      }
    }

    AsyncFunction("getExtraParamsAsync") { (promise: Promise) in
      AppController.sharedInstance.getExtraParams { extraParams in
        promise.resolve(extraParams)
      } error: { error in
        promise.reject(error)
      }
    }

    AsyncFunction("setExtraParamAsync") { (key: String, value: String?, promise: Promise) in
      AppController.sharedInstance.setExtraParam(key: key, value: value) {
        promise.resolve(nil)
      } error: { error in
        promise.reject(error)
      }
    }

    AsyncFunction("readLogEntriesAsync") { (maxAge: Int) -> [[String: Any]] in
      // maxAge is in milliseconds, convert to seconds
      do {
        return try UpdatesLogReader().getLogEntries(newerThan: Date(timeIntervalSinceNow: TimeInterval(-1 * (maxAge / 1000))))
      } catch {
        throw Exception(name: "ERR_UPDATES_READ_LOGS", description: error.localizedDescription)
      }
    }

    AsyncFunction("clearLogEntriesAsync") { (promise: Promise) in
      UpdatesLogReader().purgeLogEntries(olderThan: Date()) { error in
        guard let error = error else {
          promise.resolve(nil)
          return
        }
        promise.reject("ERR_UPDATES_READ_LOGS", error.localizedDescription)
      }
    }

    AsyncFunction("fetchUpdateAsync") { (promise: Promise) in
      AppController.sharedInstance.fetchUpdate { fetchUpdateResult in
        switch fetchUpdateResult {
        case .success(let manifest):
          promise.resolve([
            "isNew": true,
            "isRollBackToEmbedded": false,
            "manifest": manifest
          ])
          return
        case .failure:
          promise.resolve([
            "isNew": false,
            "isRollBackToEmbedded": false
          ])
          return
        case .rollBackToEmbedded:
          promise.resolve([
            "isNew": false,
            "isRollBackToEmbedded": true
          ])
          return
        case .error(let error):
          promise.reject("ERR_UPDATES_FETCH", error.localizedDescription)
          return
        }
      } error: { error in
        promise.reject(error)
      }
    }

    Function("setUpdateURLAndRequestHeadersOverride") { (configOverride: UpdatesConfigOverrideParam?) in
      try AppController.sharedInstance.setUpdateURLAndRequestHeadersOverride(configOverride?.toUpdatesConfigOverride())
    }

    AsyncFunction("showReloadScreen") { (options: ReloadScreenOptions?) in
#if DEBUG
      if let reloadScreenManager = AppController.sharedInstance.reloadScreenManager {
        reloadScreenManager.setConfiguration(options)
        reloadScreenManager.show()
      }
#endif
    }.runOnQueue(.main)

    AsyncFunction("hideReloadScreen") {
#if DEBUG
      if let reloadScreenManager = AppController.sharedInstance.reloadScreenManager {
        reloadScreenManager.hide()
      }
#endif
    }.runOnQueue(.main)
  }

  public func onStateMachineContextEvent(context: UpdatesStateContext) {
    sendEvent(EXUpdatesStateChangeEventName, [
      "context": context.json
    ])
  }

  internal struct UpdatesConfigOverrideParam: Record {
    @Field var updateUrl: URL?
    @Field var requestHeaders: [String: String]

    func toUpdatesConfigOverride() -> UpdatesConfigOverride {
      return UpdatesConfigOverride(
        updateUrl: updateUrl,
        requestHeaders: requestHeaders
      )
    }
  }
}
