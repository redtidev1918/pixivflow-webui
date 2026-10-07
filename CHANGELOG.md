# Changelog

## [2.0.0](https://github.com/redtidev1918/pixivflow-webui/compare/v1.1.0...v2.0.0) (2026-09-26)


### ⚠ BREAKING CHANGES

* **host:** drop the Electron shell bridge

### Features

* **auth:** complete interactive login in the host's in-app window ([0bd6887](https://github.com/redtidev1918/pixivflow-webui/commit/0bd68879bbc3ac4dfa67506801afd309495f794c))
* **dashboard:** add scheduler health summary; bump ReleaseGraph engine to fix release PR creation ([f7df887](https://github.com/redtidev1918/pixivflow-webui/commit/f7df8877595fbea4fb8ac794fe1ac49807afee7f))
* **deliveries:** add the read-only delivery panel ([a2fda2e](https://github.com/redtidev1918/pixivflow-webui/commit/a2fda2e0b6689dda766595eb8f7985a8318e2f52))
* **download:** announce a download that finished, with the folder actions ([8375ca2](https://github.com/redtidev1918/pixivflow-webui/commit/8375ca256251df73fcd55de3edeef15424360d0c))
* **download:** show where downloads really land, with actions on it ([f2936f4](https://github.com/redtidev1918/pixivflow-webui/commit/f2936f4edfaadbf18dccffc4c04d8e0bf70d8598))
* **errors:** guide users to sign in instead of showing raw backend errors ([a8dfb4a](https://github.com/redtidev1918/pixivflow-webui/commit/a8dfb4a65ecbceb95049c8d3eea558381b811d04))
* **files:** add an "open folder" action for downloaded work ([b192896](https://github.com/redtidev1918/pixivflow-webui/commit/b1928962011e46e995605430f13fe416202ed3d5))
* **files:** offer copying a path beside opening the folder ([e10b6a7](https://github.com/redtidev1918/pixivflow-webui/commit/e10b6a7a0b1f3398a16dcf1b0e5d30435948a5e0))
* **host:** add a capability layer for device-facing actions ([530a7c6](https://github.com/redtidev1918/pixivflow-webui/commit/530a7c6e59cae56370c25dff6ade76a5248fff3c))
* **host:** make the clipboard a first-class device capability ([54a2e4b](https://github.com/redtidev1918/pixivflow-webui/commit/54a2e4b07cf19d7012e12cd203e8c94ef9622f38))
* **host:** make the device capability layer the only door to the host ([13c359e](https://github.com/redtidev1918/pixivflow-webui/commit/13c359e57ce12033a5c1f444f7ce77f5a9194ee3))
* **ui:** give the shell a fixed viewport layout and a real design token layer ([ca176fb](https://github.com/redtidev1918/pixivflow-webui/commit/ca176fb7ca0c37fbb0e4ea64d1eae188af4cc968))


### Bug Fixes

* **config:** keep the shared configFiles cache in the array shape its readers assume ([11559ac](https://github.com/redtidev1918/pixivflow-webui/commit/11559ac2f8badedd83f3d2ebeade4bb479cee9f2))
* **deps:** make npm ci resolvable again ([#27](https://github.com/redtidev1918/pixivflow-webui/issues/27)) ([f1f455d](https://github.com/redtidev1918/pixivflow-webui/commit/f1f455d95c58a036c208bb1a718398a4cc15aff3))
* resolve login mode labels and stop clipping them ([293f9c8](https://github.com/redtidev1918/pixivflow-webui/commit/293f9c88c9047a064bd3f92bfd674a598ec298f2))


### Code Refactoring

* **host:** drop the Electron shell bridge ([d0e28cd](https://github.com/redtidev1918/pixivflow-webui/commit/d0e28cd97c18ff6d869579307e9075f80da42f8c))

## [1.1.0](https://github.com/redtidev1918/pixivflow-webui/compare/v1.0.1...v1.1.0) (2026-09-18)


### Features

* **scheduler:** add Execution tab, candidate funnel, relaxed retry, correlated slot logs ([cd89296](https://github.com/redtidev1918/pixivflow-webui/commit/cd892967119880a23fdffe5a0031a432b544e37f))
* **scheduler:** read-only scheduler control panel ([89ac9fb](https://github.com/redtidev1918/pixivflow-webui/commit/89ac9fb95f33e55063141c40be861bf2b453fea8))
* **scheduler:** read-only scheduler control panel for WebUI Control Center Phase 1 ([02c5051](https://github.com/redtidev1918/pixivflow-webui/commit/02c50513afab12d908dfb7e77b6e507a4f8f78a9))
* **scheduler:** Recovery retry action for terminal cells ([#25](https://github.com/redtidev1918/pixivflow-webui/issues/25)) ([695856b](https://github.com/redtidev1918/pixivflow-webui/commit/695856b09f4266fc8285f91c66535e24a3809799))
