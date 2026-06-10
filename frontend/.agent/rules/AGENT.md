---
trigger: always_on
---

# Hướng dẫn viết Spec cho Dev Frontend

> Tài liệu này áp dụng cho **mọi dự án frontend** — React, Next.js, Vue, Angular, hoặc bất kỳ framework nào.
> Giúp bạn viết spec đủ rõ để giảm các lỗi thường gặp khi làm việc với AI coding assistant hoặc khi handoff giữa PM, Designer, QA và Frontend Developer.

---

## Mục tiêu của spec frontend

Một spec frontend tốt không chỉ mô tả UI "trông như thế nào", mà còn phải trả lời được:

- User vào flow này từ đâu?
- User nhìn thấy gì ở từng trạng thái?
- User tương tác như thế nào?
- Hệ thống phản hồi ra sao khi thành công, thất bại, loading hoặc dữ liệu rỗng?
- Điều gì là bắt buộc, điều gì chỉ là tùy chọn?
- Những phần nào tuyệt đối không được phá vỡ?

### Kết quả mong muốn

Spec tốt sẽ giúp:

- Giảm việc hiểu sai yêu cầu
- Giảm bug do edge case bị bỏ sót
- Giảm hiện tượng "fix chỗ này vỡ chỗ kia"
- Dễ viết test, dễ review, dễ maintain
- Dễ dùng với AI coding assistant

---

## Khi nào cần spec

### Có thể chỉ cần prompt ngắn hoặc ticket đơn giản khi

- Thay text hoặc icon nhỏ
- Chỉnh spacing đơn giản
- Sửa màu theo design token đã rõ
- Viết component nhỏ có test rõ ràng

### Nên viết spec khi

- Làm feature mới
- Sửa bug có nhiều tác động liên quan
- Có nhiều state UI
- Có tương tác phức tạp
- Có responsive behavior khác nhau giữa mobile/tablet/desktop
- Có gọi API, cache, optimistic update hoặc retry
- Có yêu cầu accessibility hoặc performance
- Có rủi ro regression
- Có form với validation phức tạp
- Có animation hoặc transition quan trọng

---

## 12 nguyên tắc viết spec hiệu quả

### 1. Mỗi spec chỉ nên tập trung vào một feature hoặc một bugfix

Không nên viết kiểu:

> Cải thiện màn dashboard và tối ưu trải nghiệm orders.

Nên tách thành các spec nhỏ như:

- Filter orders theo date range
- Order detail drawer
- Fix double-submit ở checkout
- Empty state cho notification center

**Mục tiêu:** giảm scope mơ hồ và tránh phá vỡ chức năng khác.

---

### 2. Dùng từ khóa mức độ bắt buộc rõ ràng

Nên quy ước dùng (theo RFC 2119):

- **MUST**: bắt buộc
- **SHOULD**: nên làm, trừ khi có lý do chính đáng
- **MAY**: tùy chọn
- **MUST NOT**: không được phép

Ví dụ:

- Search input **MUST** debounce 300ms.
- Error banner **SHOULD** giữ nguyên đến khi user sửa input.
- Drag-and-drop upload **MAY** được đưa vào phase 2.
- Submit button **MUST NOT** cho phép bấm nhiều lần trong lúc request đang chạy.

---

### 3. Luôn mở đầu bằng Goal, Non-goals, Constraints, Invariants

#### Goal

Feature này giải quyết vấn đề gì?

#### Non-goals

Những gì chủ động không làm trong phạm vi này.

#### Constraints

Các ràng buộc về:

- Design system (Ant Design, Shadcn, Material UI...)
- API hiện có (REST, GraphQL, tRPC...)
- Routing (app router, pages router, file-based...)
- Browser support (Chrome, Safari, Firefox, IE...)
- Thư viện phải dùng / không được dùng
- Performance budget (bundle size, LCP, CLS...)

#### Invariants

Những thứ tuyệt đối không được thay đổi hoặc phá vỡ.

Ví dụ invariants:

- Shortcut bàn phím hiện tại phải giữ nguyên
- Checkout total luôn phải khớp với server-calculated amount
- Shift-click row selection phải tiếp tục hoạt động
- Existing URL params phải backward-compatible

---

### 4. Viết spec theo user scenario, không viết theo component tree

Spec yếu thường viết:

> Tạo modal có 2 input, 1 button, 1 icon close.

Spec tốt nên viết:

- User vào từ đâu
- User thấy gì đầu tiên
- User thao tác gì
- Hệ thống phản hồi thế nào
- Flow kết thúc ra sao

Ví dụ:

1. User bấm "Add address" từ trang checkout
2. Modal mở lên với focus nằm ở trường Full name
3. Khi user submit form hợp lệ, hệ thống gửi request tạo địa chỉ mới
4. Khi thành công, modal đóng và danh sách địa chỉ được refresh
5. Khi lỗi, modal giữ nguyên dữ liệu người dùng đã nhập

---

### 5. Mọi màn hình hoặc component quan trọng phải có state matrix

Tối thiểu hãy mô tả các state sau nếu có:

- Initial
- Loading (phân biệt: initial load, refetch, background refresh)
- Success
- Empty
- Error (network error, validation error, server error)
- Disabled
- Submitting
- Offline
- Unauthorized / Forbidden
- Crashed (error boundary fallback)

Mỗi state nên mô tả:

- User thấy gì?
- User làm được gì?
- Thành phần nào bị disable?
- Điều gì làm chuyển sang state tiếp theo?

Ví dụ:

| State      | User thấy gì                              | User làm được gì    | Transition               |
| ---------- | ----------------------------------------- | ------------------- | ------------------------ |
| Initial    | Skeleton placeholder                      | Không tương tác     | Khi API bắt đầu gọi      |
| Loading    | Skeleton 6 dòng                           | Không click row     | Khi API success/error    |
| Success    | Data table đầy đủ                         | Click, sort, filter | Khi đổi filter → refetch |
| Empty      | Empty illustration + CTA "Create item"    | Click CTA           | Sang create flow         |
| Error      | Error banner + nút Retry                  | Retry               | Gọi lại API              |
| Submitting | Button loading + form disabled            | Không submit lại    | Khi request resolve      |
| Crashed    | Fallback UI "Đã xảy ra lỗi" + nút Tải lại | Click tải lại       | Remount component        |

#### Loading strategy

Cần phân biệt rõ các kiểu loading:

- **Initial loading**: Lần đầu vào trang → Skeleton hoặc Spinner
- **Refetch loading**: Đổi filter → Giữ data cũ + loading indicator, hay xóa sạch + skeleton?
- **Pagination loading**: Load thêm → Append data hay replace?
- **Action loading**: Submit form → Button spinner + disable form
- **Background loading**: Auto-refresh → Không hiển thị loading cho user

---

### 6. Luôn có interaction contract

Đừng chỉ mô tả giao diện. Hãy mô tả chính xác hành vi tương tác:

- Click làm gì?
- Tap trên mobile làm gì?
- Enter/Space/Esc làm gì?
- Focus ban đầu ở đâu?
- Focus trả về đâu sau khi đóng modal?
- Có cho submit bằng Enter không?
- Double click hoặc double submit xử lý thế nào?
- Long press trên mobile có behavior riêng không?
- Drag and drop có support không?

Ví dụ:

- Pressing `Enter` trong trường Password **MUST** submit form nếu dữ liệu hợp lệ.
- Pressing `Esc` **MUST** đóng modal nếu không có request đang submit.
- Khi modal đóng, focus **MUST** quay về phần tử đã mở modal.
- Double click row **MUST NOT** gửi 2 request.

---

### 7. Viết rõ responsive contract

Không được chỉ ghi "responsive". Cần ghi:

- Breakpoint nào là nguồn sự thật
- Layout thay đổi ra sao theo breakpoint
- Text dài xử lý bằng truncate hay wrap
- Table trên mobile chuyển thành card hay scroll ngang
- Kích thước ảnh giữ tỷ lệ thế nào
- Touch target size tối thiểu (48x48 dp trên mobile)

Ví dụ:

- `< 768px`: login dialog render full-screen sheet
- `>= 768px`: dialog render centered, max-width 480px
- Data table trên mobile **MUST** chuyển sang card list hoặc horizontal scroll
- Product title **MUST** clamp 2 dòng ở mobile và 1 dòng ở desktop list view
- Button touch target **MUST** tối thiểu 44x44px

---

### 8. Accessibility là bắt buộc, không phải bổ sung sau

Ít nhất spec phải nêu rõ:

- Accessible name của control
- Keyboard operability
- Focus visible
- Focus order (tab order)
- ARIA role nếu là custom widget
- Screen reader announcement nếu có async update
- Contrast tối thiểu theo guideline nội bộ hoặc WCAG 2.1 AA
- `prefers-reduced-motion` cho animation

Ví dụ:

- Dialog **MUST** trap focus trong lúc mở.
- Primary CTA **MUST** có accessible name trùng với visible label.
- Error message **MUST** được liên kết với input tương ứng qua `aria-describedby`.
- Focus ring **MUST** luôn nhìn thấy được khi điều hướng bằng bàn phím.
- Toast notification **MUST** dùng `role="alert"` hoặc `aria-live="polite"`.

---

### 9. Tách data contract khỏi UI contract

Frontend spec cần chỉ rõ:

- Endpoint nào được gọi
- Method gì
- Params nào bắt buộc
- Field nào nullable
- Mapping trạng thái HTTP sang UI như thế nào
- Có retry không
- Có optimistic update không
- Có cache invalidate không

#### Với REST API

Ví dụ:

- `GET /api/orders?from=&to=` dùng để lấy danh sách orders
- `401` hiển thị session expired banner
- `403` hiển thị không có quyền truy cập
- `500` hiển thị generic error + Retry
- Response field `customer.avatarUrl` có thể là `null`, UI phải fallback về initials avatar

#### Với GraphQL

Ví dụ:

- `useOrdersQuery({ variables: { filter } })` — eager query, skip khi chưa chọn filter
- `useCreateOrderMutation()` — mutation, invalidate cache `orders` khi success
- Field `customer.phone` **MAY** là `null`, UI **MUST** hiển thị `"-"`
- Fetch policy: `cache-and-network` cho danh sách, `cache-first` cho chi tiết
- Lazy query cho modal/drawer (chỉ gọi khi mở)

#### Mapping lỗi sang UI

| HTTP / GraphQL Error          | UI Behavior                                            |
| ----------------------------- | ------------------------------------------------------ |
| `401 / UNAUTHENTICATED`       | Redirect đến trang login hoặc hiển thị session expired |
| `403 / FORBIDDEN`             | Banner "Bạn không có quyền truy cập"                   |
| `404 / NOT_FOUND`             | Empty state hoặc redirect                              |
| `422 / BAD_USER_INPUT`        | Inline validation error trên từng field                |
| `500 / INTERNAL_SERVER_ERROR` | Generic error + nút Retry                              |
| Network error                 | Offline banner hoặc toast                              |

---

### 10. Validation contract cho form

Mỗi form field cần ghi rõ:

- Bắt buộc hay tùy chọn
- Validation rule (min/max length, regex, custom logic)
- Thời điểm validate (on blur, on change, on submit, hoặc kết hợp)
- Error message hiển thị gì và ở đâu (inline dưới field, toast, banner)
- Có server-side validation không (ví dụ: check email trùng)

Ví dụ:

| Field    | Required | Rule                    | Validate khi                     | Error message                        |
| -------- | -------- | ----------------------- | -------------------------------- | ------------------------------------ |
| Email    | MUST     | Email format (RFC 5322) | On blur + on submit              | "Email không hợp lệ"                 |
| Họ tên   | MUST     | Min 2, max 100 ký tự    | On submit                        | "Vui lòng nhập họ tên"               |
| SĐT      | SHOULD   | 10-11 chữ số            | On blur                          | "Số điện thoại không đúng định dạng" |
| Mật khẩu | MUST     | Min 8, có chữ hoa + số  | On change (strength) + on submit | "Mật khẩu quá yếu"                   |

Quy tắc chung:

- Form **MUST NOT** bị reset khi API trả về lỗi validation.
- Inline error **MUST** xuất hiện ngay dưới field liên quan.
- Focus **SHOULD** nhảy đến field lỗi đầu tiên khi submit thất bại.
- Server-side validation error **MUST** được map về đúng field tương ứng nếu có thể.

---

### 11. Animation và transition contract

Đừng chỉ ghi "có animation". Cần mô tả:

- Transition nào cần animate (modal open/close, tab switch, toast, hover...)
- Duration bao nhiêu ms
- Easing function nào (ease, ease-out, spring...)
- Có respect `prefers-reduced-motion` không (**MUST**)
- Animation có gây layout shift không (**MUST NOT**)

Ví dụ:

- Modal open: `opacity 0→1 + scale 0.95→1`, 150ms, `ease-out`
- Modal close: `opacity 1→0`, 100ms, `ease-in`
- Tab switch: **MUST NOT** có animation gây layout shift
- Toast enter: slide từ phải, 200ms, `ease-out`
- Skeleton → content: **MUST** giữ nguyên kích thước, không gây CLS

Quy tắc chung:

- Khi user bật `prefers-reduced-motion: reduce`, mọi animation **MUST** bị tắt hoặc chuyển thành instant.
- Animation **MUST NOT** vượt quá 400ms cho bất kỳ transition nào.
- Infinite animation (spinner, pulse) **SHOULD** dùng `will-change` hoặc GPU-accelerated properties.

---

### 12. Mỗi spec nên có acceptance criteria đo được

Đừng viết:

- Trang phải mượt
- UX phải tốt
- Dễ sử dụng

Hãy viết:

- Submit button **MUST** bị disable trong lúc request chạy
- Form **MUST NOT** bị reset khi API trả về lỗi validation
- Search results **SHOULD** hiển thị trong vòng 300ms sau khi debounce kết thúc trong điều kiện mock API nội bộ
- Không được phát sinh layout shift (CLS = 0) khi skeleton chuyển sang content
- LCP **SHOULD** dưới 2.5s trên mạng 4G
- Bundle size tăng thêm **MUST NOT** vượt quá 50KB gzipped cho feature mới

Acceptance criteria càng đo được, dev và QA càng dễ xác minh.

---

## Cấu trúc chuẩn của một spec frontend

Dưới đây là cấu trúc khuyến nghị (16 phần):

### 1. Feature

Tên feature rõ ràng.

### 2. Background

Bối cảnh và vấn đề hiện tại.

### 3. Goal

Kết quả user/business mong muốn.

### 4. Non-goals

Những gì nằm ngoài scope.

### 5. Entry points

Route, CTA, screen hoặc nơi user bắt đầu flow.

### 6. User scenarios

Luồng chính, luồng phụ, luồng lỗi.

### 7. UI states

Initial, loading, success, empty, error, disabled, offline, crashed...

### 8. Interaction contract

Keyboard, click, focus, submit, cancel, navigation, double-action prevention.

### 9. Validation contract

Từng field: required, rule, thời điểm validate, error message.

### 10. Responsive contract

Breakpoints và cách layout thay đổi.

### 11. Accessibility contract

Keyboard, focus, screen reader, contrast, motion.

### 12. Animation contract

Transition, duration, easing, reduced-motion, CLS prevention.

### 13. Data contract

API endpoint/query, params, mapping response/error, cache strategy.

### 14. Acceptance criteria

Các câu MUST/SHOULD có thể kiểm thử, có thể đo được.

### 15. Out of scope / Future work

Những gì để phase sau.

### 16. Risks / Open questions

Điều gì còn chưa chắc chắn.

---

## Hướng dẫn cho AI coding assistant

Khi được yêu cầu viết spec hoặc phân tích feature, AI **MUST**:

1. Hỏi clarify nếu yêu cầu còn mơ hồ
2. Output bằng **tiếng Việt**
3. Tuân theo đúng **cấu trúc 16 phần** đã nêu ở trên
4. Dùng từ khóa **MUST / SHOULD / MAY / MUST NOT** cho mọi yêu cầu
5. Bao gồm **state matrix** dạng bảng cho component quan trọng
6. Bao gồm **data contract** với API/GraphQL cụ thể
7. Liệt kê **acceptance criteria** đo được, có thể kiểm thử
   Khi được yêu cầu implement code, AI **MUST**:
8. Đọc spec trước nếu có
9. Kiểm tra component dependencies trước khi sửa
10. Tôn trọng mọi **Invariants** đã khai báo
11. Không phá vỡ accessibility contract
12. Đảm bảo loading state và error state được xử lý đầy đủ
13. Không tạo layout shift khi chuyển state
14. Không được thay đổi code từ những module, component khác ngoài chức năng hỏi hoặc những component dùng chung
15. Dùng những components có thể tái sử dụng, được dùng chung ở nhiều components khác
16. Nếu chỉnh sửa code của người khác thì phải comment nó lạ

Cuối cùng phải luôn thực hiện là bất kì câu hỏi nào mỗi Khi tôi hỏi bạn thì hãy đưa ra prompt chuẩn bằng tiếng Việt dựa trên những nguyên tắc trên và tiến hành chạy.

ví dụ:
khi tôi hỏi: "Phần tổng quan trong module báo cáo được xây dựng như thế nào" thì bạn nên đưa ra promt chuẩn cho tôi
"Phân Tích Tab Tổng Quan Report
Phân tích kiến trúc và data flow của tab Tổng quan trong module Báo cáo." và dừng lại
khi đấy tôi đã có promt chuẩn thì mới sử dụng nó và thực thi được.
