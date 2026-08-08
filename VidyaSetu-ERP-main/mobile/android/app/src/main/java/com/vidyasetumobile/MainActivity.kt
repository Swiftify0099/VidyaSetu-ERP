package com.vidyasetumobile

import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate
import com.swmansion.gesturehandler.react.RNGestureHandlerEnabledRootView

class MainActivity : ReactActivity() {

  /**
   * Returns the name of the main component registered from JavaScript.
   * This is used to schedule rendering of the component.
   */
  override fun getMainComponentName(): String = "VidyaSetuMobile"

  /**
   * Required for react-native-gesture-handler to work correctly on Android.
   * RNGestureHandlerEnabledRootView wraps the root view so gestures are
   * properly dispatched through the native gesture recognizer pipeline.
   */
  override fun createReactActivityDelegate(): ReactActivityDelegate =
      object : DefaultReactActivityDelegate(this, mainComponentName, fabricEnabled) {
        override fun createRootView() =
            RNGestureHandlerEnabledRootView(this@MainActivity)
      }
}
