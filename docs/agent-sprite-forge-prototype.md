# 符文地牢 × Agent Sprite Forge：可玩的 Sprite Atlas 試驗

這是 **實際接入 Agent Sprite Forge 的網頁播放引擎**，但目前**沒有執行 AI 影片生成**。請勿將測試圖格誤稱為 AI 影片輸出或 Forge toolchain 正式匯出檔。

## 已做的事

- 原樣放入 Agent Sprite Forge v0.4 的 MIT 授權 `forge-runtime.mjs`：
  `vendor/agent-sprite-forge/forge-runtime.mjs`。出處：
  https://github.com/0x0funky/agent-sprite-forge/blob/main/skills/video2dsprite/references/runtime/forge-runtime.mjs
- `dungeon-forge-sprites.mjs` 使用**該原生模組的** `normalizeAnimation`、
  `fallbackCell`、`frameAt`、`gaitFrame`、`anchoredRect`。
- 主角暫以 **code-art fallback（現有 DungeonCharacter 向量角色繪成圖格）**
  建立真正的離屏 sprite atlas：待機、走、跑、詠唱、施法、衝刺、
  受傷、倒地，共 8 種狀態。碰撞、技能、傷害、存檔仍由原本引擎管理。
- 與專案 README 的 Code Art 後備路線一致：此模式為**程式繪製的資源**，
  而不是 Image-to-Video 產物。原來的程序式角色動畫保留為載入失敗時的回退。
- 進遊戲的右上角「逐格動畫：開 / 關」可 A/B 比較；開關只儲存個人偏好，
  不會修改正式遠征存檔。
- 程序式 Atlas 在瀏覽器執行階段建立，沒有下載 AI 影片，也沒有消耗外部 API 額度。

## 後續如何替換成 Agent Sprite Forge 真正輸出

上游完整流程：[Agent Sprite Forge](https://github.com/0x0funky/agent-sprite-forge)

1. 在有 Python、FFmpeg、可用圖片/影片生成服務的機器上依 README 安裝。
2. 用 `$generate2dsprite` 製作與遊戲角色相同視角、衣服和配色的角色主圖，
   審核通過後用 `$video2dsprite` 產生每個動作的影片。
3. 由上游 `sprite_set.py`、`engine_export.py` 匯出各動作的 `animation.json 3.0`
   與 PNG fallback atlases。應檢查源視角／腳底錨點／動畫結尾／去背品質。
4. 將各動作的檔案放在自己的 GitHub Pages 站點，例如：
   `assets/dungeon/forge/player/idle/animation.json` 與 `idle-atlas-00.png`
   （兩者相對路徑依上游 manifest）。
5. 瀏覽器 Console 或之後的載入流程可透過：
   ```js
   await window.DungeonForgeSprites.loadSet({
     idle: 'assets/dungeon/forge/player/idle/animation.json',
     walk: 'assets/dungeon/forge/player/walk/animation.json',
     run: 'assets/dungeon/forge/player/run/animation.json',
     cast: 'assets/dungeon/forge/player/cast/animation.json',
     chant: 'assets/dungeon/forge/player/chant/animation.json',
     dash: 'assets/dungeon/forge/player/dash/animation.json',
     hurt: 'assets/dungeon/forge/player/hurt/animation.json',
     fallen: 'assets/dungeon/forge/player/fallen/animation.json'
   });
   ```
   只須提供 `idle` 與你有的其他動作；未提供動作仍沿用 code-art 圖格。
   這個介面**只接受同網域資源**，若任何單一載入失敗，已在使用的動畫資源不會被覆蓋。
6. 如需查看當前來源：
   ```js
   window.DungeonForgeSprites.diagnostic()
   ```
   `source: 'codeart'` 表示測試畫格；`source: 'forge-package'` 表示真正讀入了上游 3.0 套件。

## 動畫與遊戲邏輯對位

- 腳底錨點使用 `sourceAnchor`；`anchoredRect` 保持世界座標不動。
- 走路與跑步使用原有移動後的 `pose.phase`，經上游 `gaitFrame` 選格。
  碰到障礙停止移動時不會在原地跑腳。
- 受傷與施法依原遊戲 `castProgress`、`hurtProgress` 定格，不決定傷害判定。
- 只有玩家主角採用此試驗模式；Boss、NPC 目前維持 HD 2.5D 原模型，
  以避免生成資源不完整造成畫質倒退。
- 預設開啟，可手動關閉。模組未載入、JS 關閉、圖格生成失敗時沿用原渲染器。
- 這是 PNG atlas 渲染；不涉及 VP9 WebM、packed-alpha MP4 解碼或 WebGL compositor。

## 實際狀態、限制及法律資訊

這一版是**可玩的接入試驗**，不是全角色完成 AI 生成。現有測試素材不是
`sprite_set.py run` 透過影片生成取得的素材，因此不能宣稱經過
Agent Sprite Forge 官方素材 QA 或真人目測審核。

原始上游代碼 © 2026 0x0funky，MIT License，詳見
`vendor/agent-sprite-forge/LICENSE`。本專案其他原創遊戲素材維持各自的授權條件。
