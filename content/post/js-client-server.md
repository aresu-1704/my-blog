+++
title       = "JavaScript trong mô hình Client–Server: Từ trình duyệt đến server"
author      = "Thuận An"
date        = 2025-12-22T00:23:10+07:00
draft       = false
description = "Khám phá cách JavaScript hoạt động ở cả phía Client và Server, cùng demo thực tế về giao tiếp Client-Server"
categories  = ["Programming", "JavaScript", "Networking"]
tags        = ["JavaScript", "Client-Server", "Node.js", "Full-stack", "HTTP"]
image       = "images/js-client-server.jpg"
+++

## Giới thiệu

Trước đây, JavaScript (JS) chỉ được biết đến như một ngôn ngữ "trang trí" cho giao diện web (Front-end). Nhưng với sự ra đời của **Node.js**, JavaScript đã vươn mình trở thành một ngôn ngữ **Full-stack**, hoạt động mạnh mẽ ở cả phía Client (người dùng) và Server (máy chủ).

Bài viết này sẽ mổ xẻ cách JavaScript vận hành trong mô hình Client-Server và hướng dẫn bạn xây dựng một ứng dụng demo đơn giản để thấy rõ sự kết nối này.

---

## 1. Mô hình Client – Server là gì?

Hãy tưởng tượng bạn đi ăn nhà hàng:

- **Client (Khách hàng)**: Là bạn. Bạn xem menu và đưa ra yêu cầu (Request) là món ăn bạn muốn.
- **Server (Nhà bếp)**: Là nơi tiếp nhận yêu cầu, chế biến món ăn và trả lại kết quả (Response) là món ăn hoàn chỉnh.

### Trong lập trình web

- **Client**: Là trình duyệt (Chrome, Safari...) chạy trên máy tính/điện thoại của người dùng.
- **Server**: Là máy tính chứa cơ sở dữ liệu và logic nghiệp vụ, luôn bật để chờ yêu cầu.
- **Giao thức (HTTP)**: Là "người bồi bàn" chuyển tin nhắn giữa Client và Server.

---

## 2. JavaScript hoạt động như thế nào ở hai đầu cầu?

Điểm đặc biệt là chúng ta sử dụng cùng một ngôn ngữ cho cả hai vai trò, nhưng môi trường và nhiệm vụ lại khác nhau.

### A. JavaScript tại Client (Trình duyệt)

Tại đây, JS chạy trên môi trường trình duyệt.

**Nhiệm vụ:**

- **Thao tác DOM**: Thay đổi nội dung HTML, CSS (ví dụ: bấm nút thì hiện popup).
- **Xử lý sự kiện người dùng**: Click, cuộn chuột, gõ phím.
- **Gửi yêu cầu (Request)**: Sử dụng `fetch()` hoặc `axios` để gọi dữ liệu từ Server mà không cần tải lại trang (AJAX).

**Giới hạn:** Không thể đọc/ghi file trực tiếp trên máy tính người dùng (vì lý do bảo mật), không thể kết nối trực tiếp vào Database.

<div style="text-align: center; margin: 2rem 0;">
  <img src="/images/client-side-js.jpg" alt="JavaScript Client-Side" style="max-width: 600px; width: 100%; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15);" />
  <p style="margin-top: 0.8rem; color: #666; font-style: italic;">Mô hình Javascript ở phía khách</p>
</div>

### B. JavaScript tại Server (Node.js)

Tại đây, JS chạy trên môi trường Node.js (một runtime sử dụng V8 Engine của Google nhưng tách khỏi trình duyệt).

**Nhiệm vụ:**

- Tạo ra các **API** để Client gọi vào.
- Đọc/Ghi file trên hệ thống.
- Kết nối và truy vấn **Cơ sở dữ liệu** (MySQL, MongoDB...).
- Xử lý logic phức tạp, bảo mật, xác thực người dùng.

**Đặc điểm:** Hoạt động theo cơ chế **Non-blocking I/O** (Không chặn), giúp xử lý hàng ngàn kết nối cùng lúc rất hiệu quả.

---

## 3. Tại sao nên dùng JavaScript cho cả hai phía?

1. **Đồng bộ ngôn ngữ**: Dev chỉ cần giỏi một ngôn ngữ là có thể làm cả Front-end và Back-end.
2. **Tái sử dụng code**: Các hàm validate dữ liệu, định dạng số/chuỗi có thể dùng chung cho cả hai phía.
3. **JSON (JavaScript Object Notation)**: Dữ liệu trao đổi giữa Client và Server thường là JSON. Vì JSON "sinh ra" từ JS, việc xử lý dữ liệu trở nên cực kỳ mượt mà, không cần chuyển đổi phức tạp.
4. **Cộng đồng khổng lồ**: Kho thư viện NPM (Node Package Manager) lớn nhất thế giới.

---

## 4. Hướng dẫn Demo: Ứng dụng "Lời chào từ Server"

Chúng ta sẽ làm một ví dụ đơn giản: Client bấm nút, Server xử lý logic và trả về lời chào kèm thời gian thực.

### Chuẩn bị

- Cài đặt NodeJS [tại đây](https://nodejs.org/).
- Tạo một thư mục dự án, ví dụ `js-client-server-demo`.

### Bước 1: Xây dựng Server (Back-end)

Mở terminal tại thư mục dự án, chạy lệnh:

```bash
npm init -y
npm install express cors
```

*(Express là framework web cho Node.js, Cors giúp cho phép Client kết nối).*

Tạo file `server.js` và dán code sau:

```javascript
// server.js
const express = require('express');
const cors = require('cors');
const app = express();
const PORT = 3000;

// Cho phép mọi Client kết nối
app.use(cors());

// Định nghĩa một API (Endpoint)
// Khi Client gọi vào đường dẫn '/api/hello'
app.get('/api/hello', (req, res) => {
    console.log("Server: Đã nhận được yêu cầu từ Client!");

    const currentTime = new Date().toLocaleTimeString();

    // Dữ liệu Server trả về (Response)
    const data = {
        message: "Xin chào! Đây là tin nhắn từ Node.js Server.",
        time: currentTime,
        status: "success"
    };

    // Gửi trả lại dưới dạng JSON
    res.json(data);
});

// Khởi động Server
app.listen(PORT, () => {
    console.log(`Server đang chạy tại http://localhost:${PORT}`);
});
```

### Bước 2: Xây dựng Client (Front-end)

Tạo file `index.html` cùng thư mục:

```html
<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <title>JS Client Server Demo</title>
    <style>
        body { 
            font-family: sans-serif; 
            text-align: center; 
            padding-top: 50px; 
        }
        #result { 
            margin-top: 20px; 
            padding: 10px; 
            border: 1px solid #ddd; 
            display: none; 
        }
        button { 
            padding: 10px 20px; 
            cursor: pointer; 
            background: #f7df1e; 
            border: none; 
            font-weight: bold;
        }
    </style>
</head>
<body>
    <h1>Mô hình Client - Server</h1>
    <button id="btnGetData">Gửi lời chào tới Server</button>

    <div id="result">
        <h3 id="msg"></h3>
        <p>Server time: <span id="time"></span></p>
    </div>

    <script>
        const btn = document.getElementById('btnGetData');
        const resultBox = document.getElementById('result');
        const msgDisplay = document.getElementById('msg');
        const timeDisplay = document.getElementById('time');

        btn.addEventListener('click', async () => {
            try {
                // 1. Client gửi Request tới Server
                console.log("Client: Đang gửi yêu cầu...");
                const response = await fetch('http://localhost:3000/api/hello');

                // 2. Chờ Server trả lời và chuyển đổi sang JSON
                const data = await response.json();

                // 3. Hiển thị dữ liệu lên giao diện (DOM Manipulation)
                msgDisplay.innerText = data.message;
                timeDisplay.innerText = data.time;
                resultBox.style.display = 'block';
                
                console.log("Client: Đã nhận dữ liệu:", data);

            } catch (error) {
                console.error("Lỗi kết nối:", error);
                alert("Không thể kết nối tới Server!");
            }
        });
    </script>
</body>
</html>
```

### Bước 3: Chạy thử nghiệm

1. Tại terminal, chạy server: `node server.js` (Bạn sẽ thấy dòng: *Server đang chạy tại <http://localhost:3000>*)
2. Mở file `index.html` trực tiếp bằng trình duyệt.
3. Bấm nút **"Gửi lời chào tới Server"**.

**Kết quả**: Bạn sẽ thấy lời chào và thời gian hiện ra. Nếu bạn mở Console của trình duyệt (F12) và Terminal của Node.js, bạn sẽ thấy các dòng log chứng tỏ sự giao tiếp đã thành công.

---

## Tổng kết

Qua ví dụ trên, chúng ta thấy rõ luồng đi của dữ liệu:

1. **Trình duyệt (Client)** dùng JS để gửi `fetch`.
2. **Node.js (Server)** nhận tín hiệu, xử lý logic lấy giờ, và gói dữ liệu thành JSON.
3. **Trình duyệt** nhận JSON và dùng JS để cập nhật giao diện HTML.

Việc làm chủ cả hai đầu cầu này chính là bước đầu tiên để bạn trở thành một **Full-stack JavaScript Developer**. Từ đây, bạn có thể mở rộng sang xây dựng các ứng dụng phức tạp hơn như REST API, Real-time Chat, hoặc thậm chí các hệ thống Microservices.

### Các bước tiếp theo

- Tìm hiểu về **Express.js middleware** để xử lý authentication, logging
- Học cách kết nối với **Database** (MongoDB, PostgreSQL)
- Khám phá **WebSocket** để xây dựng ứng dụng real-time
- Tìm hiểu về **RESTful API design** và best practices

Happy coding!
