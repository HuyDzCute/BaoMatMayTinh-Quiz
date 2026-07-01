# SPEC.md — Trắc Nghiệm QTHTM

## 1. Concept & Vision

Một ứng dụng web quiz/trắc nghiệm **Quản Trị Hệ Thống Mạng** mang phong cách hiện đại, chuyên nghiệp nhưng gần gũi với sinh viên. Giao diện tối (dark mode) với accent màu xanh dương-cy an điện tử, tạo cảm giác như đang làm việc trong một hệ thống mạng thực thụ. Có âm thanh feedback khi trả lời đúng/sai, animations mượt, và các tính năng xã hội như bảng xếp hạng, lịch sử thi.

## 2. Design Language

### Aesthetic Direction
Dark tech terminal aesthetic — như một dashboard quản trị mạng chuyên nghiệp, kết hợp với gam màu neon điện tử. Tương tự phong cách của các trang thi trực tuyến hiện đại nhưng có cá tính riêng.

### Color Palette
- **Background**: `#0a0f1e` (deep navy dark)
- **Surface**: `#111827` (card background)
- **Surface Elevated**: `#1e293b` (hover/active states)
- **Primary**: `#3b82f6` (electric blue)
- **Primary Glow**: `#60a5fa` (lighter blue for glows)
- **Accent**: `#06b6d4` (cyan neon)
- **Success**: `#10b981` (emerald green)
- **Error**: `#ef4444` (red)
- **Warning**: `#f59e0b` (amber)
- **Text Primary**: `#f1f5f9`
- **Text Secondary**: `#94a3b8`
- **Border**: `#334155`

### Typography
- **Heading**: `Orbitron` (Google Fonts) — futuristic, tech feel
- **Body**: `Inter` (Google Fonts) — clean, readable
- **Mono**: `JetBrains Mono` (Google Fonts) — for scores, codes

### Spatial System
- Base unit: 4px
- Card padding: 24px
- Section gap: 48px
- Border radius: 12px (cards), 8px (buttons), 9999px (pills)

### Motion Philosophy
- Page transitions: fade + slide up, 300ms ease-out
- Answer selection: scale pulse + color shift, 200ms
- Correct/Wrong: shake for wrong, pulse glow for correct
- Score counting: number counter animation
- Staggered list reveals: 50ms delay between items

### Visual Assets
- Icons: Lucide React
- Decorative: CSS grid patterns, subtle glow effects
- No emoji — use SVG icons throughout

## 3. Layout & Structure

### Pages
1. **Trang chủ (`/`)** — Màn hình đầu tiên với logo, thông báo, chọn bộ đề
2. **Trang làm bài (`/quiz/[setId]`)** — Quiz chính, 1 câu hỏi mỗi màn hình
3. **Trang kết quả (`/result`)** — Hiển thị điểm, đúng/sai, xem lại bài
4. **Bảng xếp hạng (`/leaderboard`)** — Top người chơi
5. **Lịch sử thi (`/history`)** — Danh sách các lần thi

### Trang chủ Layout
- Header: Logo + Title + Navigation (Lịch sử, Bảng xếp hạng)
- Hero: Icon mạng + Title + Mô tả
- Alert box: Thông báo ca thi
- Player name input
- Grid chọn bộ đề (2 cột): 150 Câu Thầy Sáng, 190 Câu QTHTM, Linux, SAI LÀ TỒI
- Mỗi bộ đề có sub-items (20 câu/phần, thi thử)

### Quiz Layout
- Progress bar (top)
- Question counter + Score display
- Question card với các đáp án dạng button
- Navigation: Previous / Next
- Exit button

### Result Layout
- Big score display với animation
- Stats: Đúng / Sai / Phần trăm
- Action buttons: Chơi lại / Bảng xếp hạng / Lịch sử / Xem lại bài
- Review list: expandable accordion từng câu

### Responsive
- Mobile-first
- Breakpoints: sm(640px), md(768px), lg(1024px)
- Cards stack single column on mobile

## 4. Features & Interactions

### Chọn bộ đề
- Click vào bộ đề → expand sub-items
- Click vào sub-item → nhập tên (nếu chưa có) → bắt đầu quiz
- Tên người chơi được lưu localStorage

### Làm bài quiz
- Mỗi câu hỏi có 4 đáp án (A, B, C, D)
- Click đáp án → highlight đã chọn (chưa submit)
- Có thể đổi đáp án trước khi chuyển câu
- Chuyển câu: button Next/Previous hoặc keyboard arrow
- Progress bar cập nhật theo số câu đã làm
- Timer optional (hiển thị thời gian làm bài)
- Khi làm xong: nút "Nộp bài" xuất hiện

### Kết quả
- Score animated counter từ 0 → điểm thực
- Hiệu ứng confetti nếu điểm >= 80%
- Hiệu ứng shake nếu điểm < 50%
- Lưu kết quả vào localStorage (history + leaderboard)
- Xem lại: click vào câu → hiện đáp án đúng + giải thích

### Bảng xếp hạng
- Top 10 người chơi theo điểm
- Sort by: điểm, độ chính xác, ngày
- Highlight rank của người dùng hiện tại
- Data từ localStorage

### Lịch sử thi
- Danh sách các lần thi: ngày, bộ đề, điểm, độ chính xác
- Click vào item → xem chi tiết bài làm

### Keyboard shortcuts
- `→` / `Enter`: Câu tiếp theo
- `←`: Câu trước
- `1-4`: Chọn đáp án A-D

## 5. Component Inventory

### `<Header />`
- Logo (network icon) + Title
- Nav links: Lịch sử, Bảng xếp hạng
- States: default, scrolled (blur backdrop)

### `<SetSelector />`
- Grid hiển thị các bộ đề
- Collapsible sub-items
- States: collapsed, expanded, selected
- Hover: glow border effect

### `<PlayerNameModal />`
- Input tên người chơi
- Validate: không trống, max 30 ký tự
- States: empty, valid, invalid

### `<QuizQuestion />`
- Question number badge
- Question text
- 4 answer options (A, B, C, D)
- States per answer: default, selected, correct, wrong, correct-reveal
- Explanation text (shown after submit)

### `<ProgressBar />`
- Animated fill bar
- Percentage label
- Color changes: <50% red, 50-80% amber, >80% green

### `<ResultCard />`
- Animated score counter
- Stats pills: đúng, sai, %
- Grade badge (A/B/C/D/F)
- States: loading (counter), complete

### `<AnswerReview />`
- Accordion item per question
- Shows: question text, selected answer, correct answer
- Color-coded: green (correct), red (wrong)

### `<LeaderboardTable />`
- Sortable columns
- Rank badges: gold/silver/bronze for top 3
- Current player highlight

### `<HistoryItem />`
- Date, set name, score
- Expandable detail view

### `<Button />`
- Variants: primary, secondary, ghost, danger
- Sizes: sm, md, lg
- States: default, hover (glow), active (press), disabled, loading

### `<Modal />`
- Backdrop blur overlay
- Slide-in animation
- Close on backdrop click / ESC

## 6. Technical Approach

### Stack
- **Framework**: Next.js 14 (App Router)
- **Styling**: Tailwind CSS v3
- **Icons**: Lucide React
- **Fonts**: Google Fonts (Orbitron, Inter, JetBrains Mono)
- **State**: React useState/useReducer + Context API
- **Storage**: localStorage for persistence

### Data Model
```typescript
interface Question {
  id: string;
  question: string;
  answers: string[]; // A, B, C, D
  correct: number;   // index 0-3
  explanation?: string;
}

interface QuizSet {
  id: string;
  name: string;
  description: string;
  questions: Question[];
}

interface QuizResult {
  id: string;
  playerName: string;
  setId: string;
  setName: string;
  score: number;
  totalQuestions: number;
  correctCount: number;
  wrongCount: number;
  percentage: number;
  answers: number[]; // user's answers per question (-1 if unanswered)
  timeSpent: number; // seconds
  date: string; // ISO string
}

interface LeaderboardEntry {
  playerName: string;
  score: number;
  percentage: number;
  setName: string;
  date: string;
}
```

### File Structure
```
src/
  app/
    layout.tsx          # Root layout with fonts, metadata
    page.tsx            # Homepage (set selection)
    quiz/
      [setId]/
        page.tsx       # Quiz page
    result/
      page.tsx         # Result page
    leaderboard/
      page.tsx         # Leaderboard page
    history/
      page.tsx         # History page
  components/
    Header.tsx
    SetSelector.tsx
    PlayerNameModal.tsx
    QuizQuestion.tsx
    ProgressBar.tsx
    ResultCard.tsx
    AnswerReview.tsx
    LeaderboardTable.tsx
    HistoryItem.tsx
    Button.tsx
    Modal.tsx
    ui/                 # Shadcn-like primitives
  lib/
    data.ts             # Quiz data
    storage.ts          # localStorage helpers
    types.ts            # TypeScript interfaces
  context/
    QuizContext.tsx     # Global quiz state
```

### Quiz Data
- Bộ 190 câu QTHTM (Thầy Sáng) — 190 câu mẫu
- Bộ 150 câu (Thầy Sáng) — 150 câu mẫu
- Bộ 350 câu Linux — 350 câu mẫu
- SAI LÀ TỒI — 25 câu điểm liệt
- Mỗi bộ chia thành các phần 20 câu + thi thử 40 câu
