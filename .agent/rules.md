# Agent Rules & Guidelines

Dưới đây là các quy tắc và phong cách làm việc mà Agent (Antigravity) cần tuân thủ trong dự án này theo yêu cầu của User:

## 1. Kiểm tra chất lượng (Quality Assurance)
- **Luôn double-check**: Sau khi hoàn thành bất kỳ chức năng hoặc thay đổi nào, Agent phải thực hiện kiểm tra lại toàn bộ logic, các trường hợp biên (edge cases) và đảm bảo không có lỗi phát sinh ngoài ý muốn.
- **Kiểm tra Locale**: Luôn đảm bảo tất cả các chuỗi thông báo mới hoặc thay đổi đều được cập nhật đầy đủ và đồng nhất trong cả hai file ngôn ngữ: `vi.json` (Tiếng Việt) và `en.json` (Tiếng Anh).
- **Tạo Test**: Sau khi thêm mới hoặc chỉnh sửa bất kỳ chức năng nào, Agent phải tạo các bài kiểm tra (tests) bao quát đầy đủ các trường hợp để đảm bảo tính ổn định và không có lỗi.

## 2. Tiêu chuẩn Clean Code & Hiệu năng (Performance)
- **Tái sử dụng Utility**: Tuyệt đối ưu tiên sử dụng các hàm có sẵn trong `src/utils/` thay vì viết lại logic. Code phải ngắn gọn, dễ hiểu và tránh lặp lại (DRY).
- **Tối ưu Database**: Luôn chọn method query tối ưu nhất. Không dùng `queryAll` khi chỉ cần lấy 1 bản ghi. Giới hạn số lượng query đồng thời để tránh treo hệ thống.
- **Xử lý lỗi (Error Handling)**: Mọi thao tác `async` phải nằm trong khối `try-catch`. Luôn phản hồi lỗi một cách tinh tế cho người dùng qua i18n thay vì log thô.
- **Tên biến & Hàm**: Phải đặt tên rõ nghĩa, theo phong cách `camelCase` và phản ánh đúng chức năng của chúng.

## 3. Trải nghiệm người dùng (UX) & Thẩm mỹ
- **Phản hồi tức thì**: Luôn `reply` hoặc `deferReply` ngay lập tức để tránh lỗi "Interaction Failed".
- **Nhất quán Embed**: Sử dụng màu sắc từ `config.js`. Cấu trúc Embed (Thumbnail, Footer, Author) phải đồng bộ trên toàn bộ các lệnh.
- **i18n**: Không bao giờ hard-code chuỗi văn bản. Mọi thông báo phải đi qua hệ thống `t()` với đầy đủ hỗ trợ `vi` và `en`.

## 4. Bảo mật & Phân quyền (Security)
- **Cấp quyền (Permissions)**: Luôn kiểm tra `ownerOnly`, `adminOnly` hoặc quyền Discord cần thiết trước khi thực thi lệnh.
- **Validate Input**: Kiểm tra và ép kiểu dữ liệu đầu vào chặt chẽ. Tuyệt đối không để xảy ra các lỗi logic như số tiền âm hoặc ID không hợp lệ.

## 5. Ngôn ngữ giao tiếp
- **Tiếng Việt**: Ưu tiên phản hồi và giải thích cho người dùng bằng tiếng Việt một cách lịch sự, chuyên nghiệp.

## 6. Quản lý hệ thống thời gian
- Đảm bảo các bộ đếm thời gian (Cooldown) luôn độc lập và chính xác theo tài liệu [time_system_explanation_vi.md](file:///c:/Users/Simsimi/.gemini/antigravity/brain/749b5366-80eb-45fb-8c72-1059bced3bb9/time_system_explanation_vi.md).
