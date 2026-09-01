Pod::Spec.new do |s|
  s.name           = 'ConfPresenceBle'
  s.version        = '1.0.0'
  s.summary        = 'BLE presence advertising and scanning for ConfPresence ZERO'
  s.description    = 'Advertises a rotating BLE token and scans for nearby peers advertising the same token, for zero-hardware in-room presence detection.'
  s.author         = 'ConfPresence'
  s.homepage       = 'https://docs.expo.dev/modules/'
  s.platforms      = {
    :ios => '15.1'
  }
  s.source         = { git: '' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'

  # Swift/Objective-C compatibility
  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
  }

  s.source_files = "**/*.{h,m,mm,swift,hpp,cpp}"
end
