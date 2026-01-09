# GitHub Pages Documentation

Thư mục này chứa các file HTML cho GitHub Pages của QuackMuzik Bot.

## Cấu trúc

```
docs/
├── index.html          # Trang chủ
├── guide.html          # Hướng dẫn sử dụng
├── terms.html          # Điều khoản dịch vụ
├── disclaimer.html     # Tuyên bố miễn trừ trách nhiệm
├── license.html        # Giấy phép
├── css/
│   └── style.css      # Stylesheet
├── js/
│   └── main.js        # JavaScript cho navigation
└── README.md           # File này
```

## Cách kích hoạt GitHub Pages

1. **Vào Repository Settings**
   - Vào GitHub repository của bạn
   - Click vào tab **Settings**

2. **Tìm phần Pages**
   - Scroll xuống phần **Pages** trong sidebar bên trái
   - Hoặc truy cập trực tiếp: `https://github.com/YOUR_USERNAME/QuackMuzik/settings/pages`

3. **Cấu hình Source**
   - Trong phần **Source**, chọn:
     - **Branch**: `production`
     - **Folder**: `/docs`
   - Click **Save**

4. **Đợi GitHub build**
   - GitHub sẽ tự động build và publish site
   - Thường mất 1-2 phút
   - URL sẽ là: `https://YOUR_USERNAME.github.io/QuackMuzik/`

5. **Kiểm tra**
   - Truy cập URL trên để xem site
   - Nếu có lỗi, check **Actions** tab để xem build logs

## Custom Domain (Optional)

Nếu bạn muốn sử dụng custom domain:

1. Thêm file `CNAME` vào thư mục `docs/` với nội dung là domain của bạn:
   ```
   yourdomain.com
   ```

2. Cấu hình DNS records:
   - Thêm CNAME record trỏ đến `YOUR_USERNAME.github.io`
   - Hoặc A records trỏ đến GitHub IPs

3. Enable custom domain trong GitHub Pages settings

## Cập nhật nội dung

Để cập nhật nội dung:

1. Chỉnh sửa các file HTML trong thư mục `docs/`
2. Commit và push lên GitHub
3. GitHub Pages sẽ tự động rebuild và update site

## Lưu ý

- GitHub Pages chỉ hỗ trợ static files (HTML, CSS, JS)
- Không hỗ trợ server-side code (PHP, Python, etc.)
- File size limit: 1GB per repository
- Bandwidth limit: 100GB/month
- Build limit: 10 builds/hour

## Troubleshooting

### Site không hiển thị
- Kiểm tra GitHub Actions để xem có lỗi build không
- Đảm bảo đã chọn đúng branch và folder (`/docs`)
- Đợi vài phút để GitHub build xong

### CSS/JS không load
- Kiểm tra đường dẫn trong HTML (phải là relative paths)
- Đảm bảo các file CSS/JS nằm đúng vị trí
- Clear browser cache

### 404 errors
- Kiểm tra tên file có đúng không (case-sensitive)
- Đảm bảo các link trong HTML đúng

## Tham khảo

- [GitHub Pages Documentation](https://docs.github.com/en/pages)
- [GitHub Pages Jekyll](https://jekyllrb.com/docs/github-pages/) (nếu muốn dùng Jekyll)

