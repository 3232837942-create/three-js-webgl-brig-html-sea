# 免费舰载加农炮候选（Sketchfab API 核实）

## 推荐替换
- **Stylized Cannon** — LJM (UID `c001af0e023244f18c40e4c17fd2d715`)
  - 页面: https://sketchfab.com/3d-models/stylized-cannon-c001af0e023244f18c40e4c17fd2d715
  - API: `downloadType=free`; CC Attribution（需署名，允许商用）
  - 20,508 faces / 10,813 verts; OBJ; archive 2.45 MB
  - 缩略图: https://media.sketchfab.com/models/c001af0e023244f18c40e4c17fd2d715/thumbnails/1f784db159ec422b9fa06b11eb317f2d/b82e399442ae4084a4058d99b6431a71.jpeg
  - 视觉：高质量卡通青铜炮，木制轮架/炮弹，最接近 Sea of Thieves。炮管是否独立对象未知。

- **Stylized Pirate Cannon** — Gustavo Ribeiro (UID `90e0e8cb529e40f68ab0659815cdf862`)
  - 页面: https://sketchfab.com/3d-models/stylized-pirate-cannon-90e0e8cb529e40f68ab0659815cdf862
  - API: `downloadType=free`; CC Attribution
  - 8,227 faces / 4,402 verts; FBX; archive 249,872 bytes
  - 缩略图: https://media.sketchfab.com/models/90e0e8cb529e40f68ab0659815cdf862/thumbnails/037b7acd13ec4e28ba3d4caf546a6e52/d2109cc0a5724daca038b5e5b59d828b.jpeg
  - 视觉：彩色低多边形海盗炮（青绿色炮管、黄色箍、双木轮），推荐用于批量炮位。层级分离未知。

- **Stylized cannon** — NinKorr3D (UID `bc20a6049b5a4544b60183a01b351b63`)
  - 页面: https://sketchfab.com/3d-models/stylized-cannon-bc20a6049b5a4544b60183a01b351b63
  - API: `downloadType=free`; CC Attribution
  - 2,310 faces / 1,216 verts; FBX; archive 108,428 bytes
  - 缩略图: https://media.sketchfab.com/models/bc20a6049b5a4544b60183a01b351b63/thumbnails/8e621f02aa444e46aaf6af03063606bb/66c6a033f3ba40f4afaf084a5ae0b00e.jpeg
  - 极低面数，移动端友好，质量较简化。

## 历史风格备选
- **Ship cannon** — alexxx_xarchenko (UID `71d9f61a3abe413b8ab8b9eca9879900`), CC-BY, 8,072 faces / 4,356 verts, DAE, archive 9.1MB。页面 https://sketchfab.com/3d-models/ship-cannon-71d9f61a3abe413b8ab8b9eca9879900；缩略图 https://media.sketchfab.com/models/71d9f61a3abe413b8ab8b9eca9879900/thumbnails/7a557c9c0192406ba9cef6e12eea8be0/7ca46d0e9e1d4c3bb0c1325a636e7a74.jpeg 。写实木炮架+金属炮管。
- **Naval Cannon - 18th Century English Style** — Kingy (UID `d93798b2ee5d443fbc37ea9d46c38b23`), CC-BY, 45,663 faces / 23,499 verts, FBX, archive 1.13MB。页面 https://sketchfab.com/3d-models/naval-cannon-18th-century-english-style-d93798b2ee5d443fbc37ea9d46c38b23；高面数，需减面。

缩略图已下载到 `work/assets/cannon/thumb0.jpg`（LJM）、`thumb1.jpg`（Gustavo）、`thumb2.jpg`（Ship cannon）、`thumb-esther.jpg`（Esther3D 的不推荐三脚架炮，非 NinKorr）。完整下载通常须在 Sketchfab 页面点击 Download，API 的 `.binz` 是内部格式，不应直接当最终 glTF 使用。

下载验证：2026-09-06，LJM 与 Gustavo 的标准 v3 download 端点均返回 HTTP 401 / Authentication credentials were not provided；页面元数据确认免费，但实际完整文件需已登录账户/授权令牌。目前未下载完整 3D 模型，未验证对象层级。

