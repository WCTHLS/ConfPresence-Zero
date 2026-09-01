Pod::Spec.new do |s|
  s.name           = 'ConfPresenceUwb'
  s.version        = '1.0.0'
  s.summary        = 'UWB precise ranging for ConfPresence ZERO'
  s.description    = 'NearbyInteraction-based UWB distance and direction ranging between peers, for precise in-room presence detection on supported iPhones.'
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
