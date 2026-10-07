import UIKit
import React
import React_RCTAppDelegate
import ReactAppDependencyProvider

@main
class AppDelegate: UIResponder, UIApplicationDelegate {
  var reactNativeDelegate: ReactNativeDelegate?
  var reactNativeFactory: RCTReactNativeFactory?

  func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
  ) -> Bool {
    let delegate = ReactNativeDelegate()
    let factory = RCTReactNativeFactory(delegate: delegate)
    delegate.dependencyProvider = RCTAppDependencyProvider()

    reactNativeDelegate = delegate
    reactNativeFactory = factory

    if UserDefaults.standard.bool(forKey: "ApplySuggestedFix") {
      applySuggestedFix()
    }

    return true
  }
}

// OFF by default. The change suggested in #58904, applied at runtime so it can be compared without building React
// Native from source: `-[RCTTextInputComponentView _textOf:equals:]` treats equal characters as equal while the backed
// text input is the first responder. Turn it on with the launch argument `-ApplySuggestedFix YES`.
private func applySuggestedFix() {
  let selector = NSSelectorFromString("_textOf:equals:")
  guard let cls = NSClassFromString("RCTTextInputComponentView"),
        let method = class_getInstanceMethod(cls, selector) else {
    NSLog("[58904] suggested fix NOT applied: method not found")
    return
  }
  typealias TextOfEquals = @convention(c) (AnyObject, Selector, NSAttributedString, NSAttributedString) -> Bool
  let original = unsafeBitCast(method_getImplementation(method), to: TextOfEquals.self)
  let patched: @convention(block) (AnyObject, NSAttributedString, NSAttributedString) -> Bool = { view, newText, oldText in
    if let backed = (view as? NSObject)?.value(forKey: "backedTextInputView") as? UIResponder, backed.isFirstResponder {
      return newText.string == oldText.string
    }
    return original(view, selector, newText, oldText)
  }
  method_setImplementation(method, imp_implementationWithBlock(patched))
  NSLog("[58904] suggested fix applied")
}

// Not part of the bug: an app built with the iOS 27 SDK must use the UIScene life cycle, or it does not launch on
// iOS 27 (Apple TN3187). The window is created here instead of in the app delegate (Info.plist: UIApplicationSceneManifest).
class SceneDelegate: UIResponder, UIWindowSceneDelegate {
  var window: UIWindow?

  func scene(
    _ scene: UIScene,
    willConnectTo session: UISceneSession,
    options connectionOptions: UIScene.ConnectionOptions
  ) {
    guard let windowScene = scene as? UIWindowScene,
          let appDelegate = UIApplication.shared.delegate as? AppDelegate else { return }

    let window = UIWindow(windowScene: windowScene)
    self.window = window

    appDelegate.reactNativeFactory?.startReactNative(
      withModuleName: "ReproducerApp",
      in: window,
      launchOptions: nil
    )
  }
}

class ReactNativeDelegate: RCTDefaultReactNativeFactoryDelegate {
  override func sourceURL(for bridge: RCTBridge) -> URL? {
    self.bundleURL()
  }

  override func bundleURL() -> URL? {
#if DEBUG
    RCTBundleURLProvider.sharedSettings().jsBundleURL(forBundleRoot: "index")
#else
    Bundle.main.url(forResource: "main", withExtension: "jsbundle")
#endif
  }
}
