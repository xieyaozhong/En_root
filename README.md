# EnRoot

TOEIC＋TOEFL 字根／字首記憶練習 App，每回固定 10 題，並延伸到 GRE／SAT／GMAT／IELTS 高階學術詞彙。

## 目前功能

- TOEIC 11,154 詞核心庫＋TOEFL／GRE／SAT／GMAT／IELTS 高階補充庫（執行時載入並去重）
- 每回 10 題
- 綜合模式：字義、字根、情境填空
- 字根強化模式
- 生難字模式：答錯自動加入，可手動收藏
- 字首／字根／字尾拆解
- 同根字自動連結
- 生難字記憶法
- 考試詞庫切換：TOEIC 990+／TOEFL 120+／高階學術／雙滿分超額
- TOEIC 分數區間篩選
- 本機答題統計與熟悉度
- 手機／平板／桌機響應式介面
- 完整詞庫無法連線時，自動使用內建示範詞庫

## 詞庫

App 會在瀏覽器端載入並合併：
- `kknono668/toeic-vocab-tw`（TOEIC）
- `grhliu/wordtyper-vocabularies`（TOEFL／GRE／SAT／GMAT／IELTS）

公開資料集含 11,154 個 English–Traditional Chinese TOEIC 情境詞條，本 App 會先依 star rating（TOEIC 重要度）排序，再取核心 10,000 筆作為主要練習池，抽題時也會再次依重要度加權。

資料集授權：CC BY-SA 4.0  
資料集頁面：https://huggingface.co/datasets/kknono668/toeic-vocab-tw

> TOEIC 為 Educational Testing Service (ETS) 的註冊商標。本專案不是 ETS 官方產品，也未受 ETS 贊助或背書。

## 執行

這是純靜態網頁，不需要 npm、不需要後端。

直接開啟 `index.html`，或用 GitHub Pages 部署即可。

## 學習設計

單字不是只顯示中文，而是嘗試建立：

`prefix + root + suffix → 核心概念 → 中文意思 → 同根字`

例如：

`trans + port → across + carry → transport → 運輸`

對不適合硬拆字根的單字，改用情境、語意或專屬記憶法，避免錯誤字源拆解。

## 儲存

生難字、答題統計與熟悉度存放在瀏覽器 `localStorage`，不會上傳使用者學習資料。


## 超額覆蓋策略

TOEIC 與 TOEFL 並沒有一份官方固定的「滿分單字表」。EnRoot 因此採用超額覆蓋：先保留 TOEIC 商務核心，再加入 TOEFL 學術核心，最後以 GRE、SAT、GMAT、IELTS 詞庫作為滿分以上的高階延伸。

目前補充來源的原始規模：TOEFL 6,959、GRE 7,485、SAT 4,471、GMAT 2,996、IELTS Core 4,974、IELTS Advanced 3,117；這些補充詞庫彼此去重後約 13,213 個不同詞，再與 TOEIC 詞庫合併去重。

## 字根地圖

新增 `roots.html` 可搜尋字根頁，整合 `generated-english-roots-list` 的 1,061 組英文字根、字首與字尾；主練習頁也會載入同一套資料，並保留內建中文核心字根作為優先解釋。


## Word Relic 像素單字抽卡

- 每完成 10 題獲得 1 次抽卡
- 依當回合答題表現提高高稀有度機率
- N / R / SR / SSR / UR 五級卡片
- 30 張首發單字卡
- 每張卡包含繁體中文、構詞線索、來源語言、年代與詞源故事
- 重複卡會累計收藏張數
- `cards.html` 提供可搜尋的卡片圖鑑
- 收藏紀錄儲存在瀏覽器 localStorage

> 卡片中的「故事」指詞源與語義演變故事，不代表每個單字都有單一明確的「發明者」。有爭議的民間詞源會以較保守的方式描述。
