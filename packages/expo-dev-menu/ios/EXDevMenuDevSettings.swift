// Copyright 2015-present 650 Industries. All rights reserved.

import Foundation
import React

class EXDevMenuDevSettings: NSObject {
  static func getDevSettings() -> [String: Bool] {
    var devSettings: [String: Bool] = [:]

    devSettings["isElementInspectorShown"] = false
    devSettings["isHotLoadingEnabled"] = false
    devSettings["isPerfMonitorShown"] = false

    devSettings["isElementInspectorAvailable"] = false
    devSettings["isHotLoadingAvailable"] = false
    devSettings["isPerfMonitorAvailable"] = false
    devSettings["isJSInspectorAvailable"] = false

    let manager = DevMenuManager.shared

    if let bridge = manager.currentBridge,
      let bridgeSettings = bridge.module(forName: "DevSettings") as? RCTDevSettings {
      let perfMonitor = bridge.module(forName: "PerfMonitor")
      let isPerfMonitorAvailable = perfMonitor != nil

      devSettings["isElementInspectorShown"] = bridgeSettings.isElementInspectorShown
      devSettings["isHotLoadingEnabled"] = bridgeSettings.isHotLoadingEnabled
      devSettings["isPerfMonitorShown"] = bridgeSettings.isPerfMonitorShown
      devSettings["isHotLoadingAvailable"] = bridgeSettings.isHotLoadingAvailable
      devSettings["isPerfMonitorAvailable"] = isPerfMonitorAvailable
      devSettings["isJSInspectorAvailable"] = bridgeSettings.isDeviceDebuggingAvailable

      let isElementInspectorAvailable = manager.currentManifest?.isDevelopmentMode()
      devSettings["isElementInspectorAvailable"] = isElementInspectorAvailable
    }

    return devSettings
  }
}
