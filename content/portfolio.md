+++
title = "Dự án nổi bật tôi từng tham gia"
date = 2025-12-22T01:20:00+07:00
+++


## Giới thiệu

Các dự án dưới đây phản ánh quá trình tôi tiếp cận bài toán kỹ thuật từ góc nhìn thực tế: từ việc thu thập và xử lý dữ liệu, thiết kế kiến trúc hệ thống, đến triển khai và tối ưu cho môi trường sản xuất. Mỗi dự án không chỉ là một bài tập công nghệ, mà là một nỗ lực nhằm giải quyết nhu cầu cụ thể trong nông nghiệp, an ninh, mạng xã hội và giải trí.

---

## Ứng dụng nhận diện bệnh trên lá cà chua (2025)

Trong sản xuất nông nghiệp, việc phát hiện sớm bệnh trên lá cây là yếu tố quyết định đến năng suất, nhưng phương pháp thủ công vẫn chiếm ưu thế do thiếu công cụ hỗ trợ phù hợp với điều kiện thực địa. Tôi phát triển ứng dụng di động này nhằm đưa mô hình học sâu đến tay người dùng cuối một cách trực tiếp và dễ sử dụng nhất. Thay vì dựa vào các bộ dữ liệu quốc tế như PlantVillage với điều kiện lý tưởng, tôi xây dựng dataset bản địa hóa phản ánh đúng môi trường canh tác tại Việt Nam—ánh sáng không đồng đều, nền phức tạp, lá chồng chéo—rồi huấn luyện một biến thể YOLO được tối ưu cho thiết bị biên.

Kiến trúc hệ thống bao gồm backend FastAPI phục vụ inference từ mô hình PyTorch, database MongoDB lưu trữ lịch sử phát hiện và metadata, cùng với ứng dụng Flutter cho phép người dùng chụp ảnh trực tiếp tại ruộng và nhận kết quả gần như tức thì. Mô hình chỉ nặng 4.9 MB, chạy mượt trên thiết bị di động tầm trung mà vẫn đạt độ chính xác cao, cho thấy việc tối ưu kiến trúc có chủ đích mang lại giá trị thực tiễn rõ rệt. Toàn bộ mã nguồn và hướng dẫn triển khai có thể tìm thấy tại [repository trên GitHub](https://github.com/aresu-1704/tomato-disease-detect).

---

## Hệ thống giám sát và đếm số lượng người ra vào khu vực (2025)

Việc giám sát lưu lượng người trong các khu vực công cộng, cửa hàng hay văn phòng thường yêu cầu thống kê chính xác theo thời gian thực, nhưng các giải pháp thương mại thường đắt đỏ và khó tùy chỉnh. Tôi xây dựng hệ thống này dựa trên mô hình MobileNetSSD, một kiến trúc phát hiện đối tượng nhẹ và đáp ứng tốt yêu cầu real-time trên phần cứng phổ thông. Hệ thống không chỉ phát hiện người trong khung hình mà còn theo dõi quỹ đạo di chuyển để phân biệt người vào và người ra, từ đó cung cấp số liệu thống kê chính xác theo từng khoảng thời gian.

Thách thức chính nằm ở việc xử lý các tình huống phức tạp như người chồng chéo, thay đổi góc nhìn camera, và điều kiện ánh sáng khác nhau. Tôi kết hợp kỹ thuật tracking đơn giản nhưng hiệu quả để duy trì identity của từng đối tượng qua các frame liên tiếp, đồng thời tối ưu pipeline xử lý để đảm bảo độ trễ thấp. Dự án này phù hợp cho các kịch bản cần giám sát tự động mà không yêu cầu hạ tầng phức tạp, và toàn bộ implementation có sẵn trên [GitHub](https://github.com/aresu-1704/people-tracking-realtime).

---

## Mạng xã hội di động RELO (2025)

Xây dựng một nền tảng mạng xã hội từ đầu là bài toán về khả năng mở rộng, độ trễ thấp và trải nghiệm người dùng mượt mà. RELO được thiết kế như một hệ thống hoàn chỉnh với ba trụ cột chính: nhắn tin thời gian thực, newsfeed cá nhân hóa, và quản lý hồ sơ người dùng. Tôi chịu trách nhiệm phát triển toàn bộ ứng dụng di động bằng Flutter, đồng thời thiết kế luồng dữ liệu giữa client và backend FastAPI, sử dụng MongoDB làm cơ sở dữ liệu chính nhờ tính linh hoạt về schema và khả năng xử lý document lồng nhau.

Phần nhắn tin thời gian thực được xây dựng dựa trên WebSocket, đảm bảo độ trễ thấp và đồng bộ hóa tin nhắn giữa các thiết bị. Newsfeed áp dụng cơ chế pagination và lazy loading để tối ưu hiệu năng khi tải dữ liệu lớn. Một thách thức thú vị là thiết kế state management phía client sao cho đồng bộ giữa các màn hình khác nhau mà không gây rò rỉ bộ nhớ hay tải lại dữ liệu không cần thiết. Toàn bộ mã nguồn và kiến trúc hệ thống được công khai tại [RELO repository](https://github.com/aresu-1704/relo-social-network).

---

## Website nghe nhạc trực tuyến Musicresu (2024)

Streaming nhạc trực tuyến là một bài toán quen thuộc nhưng không đơn giản khi cần cân bằng giữa trải nghiệm người dùng, quản lý metadata phức tạp và khả năng gợi ý nội dung thông minh. Tôi phát triển Musicresu như một nền tảng fullstack hoàn chỉnh, sử dụng ReactJS cho giao diện người dùng và ASP.NET Core cho backend API. Hệ thống cho phép người dùng tải lên, chia sẻ và nghe nhạc trực tuyến, đồng thời tích hợp cơ chế gợi ý bài hát dựa trên lịch sử nghe—một tính năng cốt lõi giúp cải thiện engagement và thời gian sử dụng.

Kiến trúc backend được thiết kế theo mô hình RESTful, sử dụng MongoDB để lưu trữ metadata của bài hát, playlist và lịch sử nghe. Phần gợi ý hoạt động dựa trên collaborative filtering đơn giản nhưng hiệu quả, phân tích các pattern nghe nhạc để đề xuất các bài hát tương tự. Phía client, tôi tối ưu audio streaming để giảm độ trễ khi chuyển bài và hỗ trợ background playback. Dự án này giúp tôi hiểu sâu hơn về toàn bộ stack từ frontend đến backend, cũng như cách xử lý dữ liệu đa phương tiện trong môi trường web. Chi tiết triển khai có thể xem tại [repository Musicresu](https://github.com/aresu-1704/musicresu-musicwebsite).
