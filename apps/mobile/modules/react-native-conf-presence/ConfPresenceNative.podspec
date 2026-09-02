require "json"

package = JSON.parse(File.read(File.join(__dir__, "package.json")))

Pod::Spec.new do |spec|
  spec.name = "ConfPresenceNative"
  spec.version = package["version"]
  spec.summary = package["description"]
  spec.homepage = "https://github.com/WCTHLS/ConfPresence-Zero"
  spec.license = { :type => "UNLICENSED" }
  spec.author = "ConfPresence"
  spec.platform = :ios, "15.1"
  spec.source = { :git => "https://github.com/WCTHLS/ConfPresence-Zero.git", :tag => spec.version.to_s }
  spec.source_files = "ios/**/*.{h,m,mm,swift}"
  spec.frameworks = "CoreBluetooth", "CoreLocation", "NetworkExtension", "SystemConfiguration"
  spec.dependency "React-Core"
  spec.swift_version = "5.9"
end