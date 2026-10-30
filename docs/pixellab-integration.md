# PixelLab 像素素材整合 — 符文地牢

## 實際版本狀態

- 已將 PixelLab 匯出透明 PNG Sprite Sheet 的播放整合進遊戲，支援八方向，主角與既有 18 位 Boss、NPC 都可以使用。
- 遊戲「美術」面板可選取 PNG 與 pack.json 在目前分頁預覽，不會上傳檔案或金鑰。
- GitHub Pages 會檢查 assets/dungeon/pixellab/pack.json；只要公開版素材存在，便會載入其動畫。無素材時沿用 HD 2.5D／Agent Sprite Forge 程式繪製角色。
- 原本 Forge code-art 測試畫格也重新使用半解析度畫布預先繪製、2 倍 nearest 上採樣，提供更鮮明的像素輪廓。
- **尚未登入 PixelLab、無法聲稱已生成 PixelLab AI 圖檔。此版本只提供整合、轉檔流程和本機像素風預覽。**

## 從 PixelLab 取得真正素材

PixelLab 官方提供八方向角色、動畫、透明 PNG、Sprite Sheet；正式生成請用你自己的 PixelLab 帳戶。

建議角色提示詞（high-top-down、高一致性、腳底錨點固定）：

> High-top-down 2D pixel art wizard adventurer. White-silver layered hair, deep navy and teal robe with gold seams, short floating cloak, crystal-tipped staff. Complete feet visible, consistent palette and proportions, clean silhouette, selective dithering, transparent background, no text or UI, eight directions, character grounded at center. Keep costume and staff identical in every animation.

可用動作：idle、walk、run、cast、chant、dash、hurt、fallen、attack、death。
Boss 素材名稱範例：thorn（藤蔓與荊棘）、prism（碎鏡與折射）、spore（菌冠）、hollow（青銅大鐘）。

生成服務：
- https://www.pixellab.ai/mcp
- https://api.pixellab.ai/v2/docs
- https://www.pixellab.ai/termsofservice

**不要將 PixelLab API token、密碼或付費請求放進前端程式或公開 GitHub。** Codex CLI 可在你授權的本機環境連接 PixelLab MCP 生成素材，完成後才部署不含機密的 PNG。

## 可接受的匯出目錄

先將 PixelLab 生成的 PNG 存為每個角色、每種動作、每個方向一張表（可為多格均勻網格）：

    pixellab-exports/
      player/
        idle/
          east.png
          south-east.png
          south.png
          south-west.png
          west.png
          north-west.png
          north.png
          north-east.png
        walk/
          east.png
          south.png
        cast/
          south.png
      thorn/
        idle/
          south.png

支持輸入為單張或 N×M 均勻圖格。缺少方向時，會使用最接近已存在方向的 PNG。

在有 Python 和 Pillow 的電腦執行：

    python -m pip install "Pillow>=10"
    python tools/pixellab_pack.py --input pixellab-exports --out assets/dungeon/pixellab --cell 64x96 --anchor 32x90 --fps 8 --scale 1.05

工具會產生以下真正可用的檔案：

    assets/dungeon/pixellab/
      pack.json
      player__idle.png
      player__walk.png
      player__cast.png
      thorn__idle.png

素材 pack.json 是 Word Relic PixelLab v1 轉接規格，**不是 PixelLab 官方原生 JSON**；PNG 才是使用者實際生成／匯出的美術素材。範例規格放在 assets/dungeon/pixellab/pack.example.json。

打包腳本使用角色與動作的唯一檔名，以便手機選取多角色的 PNG 而不會遇到 idle.png 同名衝突。每列是一個方向，每格對應同一動作的一張影格；角色有自己的原生格尺寸、腳底錨點、縮放比、FPS。若 PixelLab 匯出的是九格八方向靜態圖，應先依標示拆成方向檔；不能假設任何排列順序。

## 手機或網頁預覽

1. 先在 PixelLab 生成並下載你自己擁有使用權的 PNG。
2. 使用上述腳本生成 pack.json 和重新排列的 PNG 表。
3. 開啟符文地牢，按「美術」，一次選取 pack.json 和相關 PNG，即可立即預覽。
4. PixelLab 素材啟用／停用可切換回原本角色。
5. 在網站上匯入只存在目前分頁，不會保存到伺服器。若要讓所有玩家看到，須把 assets/dungeon/pixellab/pack.json 及 PNG 一起提交至 GitHub 主分支。

## 安全與相容性

- 只允許同網域網站公開 PNG；前端不直接聯繫 PixelLab API。
- 匯入時會檢查圖格大小、方向、動作種類、素材數量及能否解碼 PNG。
- 載入失敗不替換已在使用的完整素材包。
- 移動方向由原遊戲 actor.pose 取得，攻擊生效、碰撞、傷害、存檔仍由原引擎判定。
- 原有 Agent Sprite Forge 的八種測試動畫及 HD 2.5D 模型仍是回退選項。
