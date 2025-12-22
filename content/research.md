+++
title = "RESEARCH"
date = 2025-12-22T01:20:00+07:00
+++

<h1 style="font-size: 3.5em; font-weight: bold; margin-bottom: 1em;">CÁC CÔNG TRÌNH NGHIÊN CỨU</h1>

## Giới thiệu

Trang này tổng hợp các nghiên cứu và công trình khoa học của tôi trong lĩnh vực Thị giác máy tính, Học sâu và ứng dụng Trí tuệ nhân tạo. Mỗi nghiên cứu đều hướng đến việc giải quyết các bài toán thực tế, đặc biệt là trong bối cảnh Việt Nam, với mục tiêu thu hẹp khoảng cách giữa lý thuyết và triển khai ứng dụng.

---

## YOLOv10n-VT: Nhận diện bệnh lá cà chua tối ưu cho thiết bị biên (2025)

**Hội nghị:** VNICT 2025 - Hội nghị quốc gia lần thứ XXVII về Công nghệ Thông tin và Truyền thông, Ninh Bình  
**Lĩnh vực:** Computer Vision, Edge AI, Agricultural AI  
**Keywords:** YOLO, Object Detection, Tomato Leaf Disease, Edge Computing

<div style="text-align: center; margin: 2rem 0;">
  <img src="/research/ki-yeu-vnict.jpg" alt="Kỷ yếu VNICT 2025" style="max-width: 600px; width: 100%; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15);" />
  <p style="margin-top: 0.8rem; color: #666; font-style: italic;">Kỷ yếu hội nghị VNICT 2025 tại Ninh Bình</p>
</div>

## Bối cảnh nghiên cứu

Cà chua là một trong những cây trồng có giá trị kinh tế cao tại Việt Nam, đặc biệt tại các vùng chuyên canh như Lâm Đồng, Gia Lai hay Đồng bằng sông Hồng. Tuy nhiên, năng suất và chất lượng cà chua thường xuyên bị ảnh hưởng bởi các bệnh trên lá do nấm, vi khuẩn và virus gây ra. Trong thực tế sản xuất, việc phát hiện bệnh vẫn chủ yếu dựa vào kinh nghiệm thủ công, dễ sai lệch và khó mở rộng trên diện rộng, đặc biệt trong bối cảnh thiếu nhân lực kỹ thuật.

Sự phát triển của học sâu và thị giác máy tính đã mở ra khả năng tự động hóa quá trình giám sát cây trồng. Trong đó, các mô hình phát hiện đối tượng theo thời gian thực như YOLO cho thấy tiềm năng lớn nhờ cân bằng tốt giữa tốc độ và độ chính xác. Tuy nhiên, khoảng cách giữa nghiên cứu và triển khai thực tế trong nông nghiệp Việt Nam vẫn còn khá lớn.

## Khoảng trống nghiên cứu

Phần lớn các nghiên cứu hiện nay về nhận diện bệnh lá cà chua sử dụng các bộ dữ liệu quốc tế như PlantVillage. Những bộ dữ liệu này thường được thu thập trong điều kiện lý tưởng, nền sạch, ánh sáng ổn định và không phản ánh đầy đủ các yếu tố nhiễu trong môi trường canh tác thực tế tại Việt Nam. Khi triển khai ngoài thực địa, hiệu năng của mô hình thường suy giảm đáng kể.

Bên cạnh đó, nhiều mô hình đạt độ chính xác cao nhưng có kiến trúc phức tạp, chi phí tính toán lớn, gây khó khăn khi triển khai trên các thiết bị biên như điện thoại thông minh, camera nông nghiệp hoặc hệ thống IoT. Điều này đặt ra nhu cầu về một hướng tiếp cận vừa sát với điều kiện địa phương, vừa tối ưu cho môi trường tài nguyên hạn chế.

## Động lực và ý tưởng nghiên cứu

Chúng tôi thực hiện nghiên cứu này với mục tiêu thu hẹp khoảng cách giữa mô hình học sâu và ứng dụng nông nghiệp thực tế tại Việt Nam. Thay vì chỉ tập trung tối đa hóa độ chính xác, chúng tôi hướng đến một giải pháp cân bằng giữa hiệu năng, độ gọn nhẹ và khả năng triển khai.

Hai trụ cột chính của nghiên cứu bao gồm việc xây dựng một bộ dữ liệu bệnh lá cà chua mang tính bản địa hóa cao và đề xuất một biến thể YOLO nhẹ, được tối ưu có chủ đích cho thiết bị biên, mang tên **YOLOv10n-VT**.

## Bộ dữ liệu VTLD: phản ánh điều kiện thực tế Việt Nam

**Vietnamese Tomato Leaf Disease Dataset (VTLD)** được xây dựng nhằm phản ánh sát nhất điều kiện canh tác tại Việt Nam. Bộ dữ liệu gồm **6.164 ảnh**, kết hợp giữa ảnh phòng thí nghiệm và ảnh chụp thực địa, được gán nhãn thủ công thành **9 lớp**, bao gồm 8 loại bệnh phổ biến và 1 lớp lá khỏe mạnh.

Khác với các dataset quốc tế, VTLD chứa nhiều yếu tố nhiễu như ánh sáng không đồng đều, nền phức tạp, lá chồng chéo và triệu chứng bệnh có kích thước nhỏ. Điều này khiến bài toán trở nên khó hơn, nhưng đồng thời giúp mô hình học được các đặc trưng có giá trị khi triển khai ngoài thực tế.

## YOLOv10n-VT: tối ưu có chủ đích cho thiết bị biên

**YOLOv10n-VT** được chúng tôi phát triển như một biến thể tinh chỉnh từ YOLOv10n, với triết lý thiết kế rõ ràng: giảm chi phí tính toán nhưng vẫn duy trì khả năng phát hiện chính xác các triệu chứng bệnh.

Thay vì sử dụng các module nặng trong backbone, kiến trúc được đơn giản hóa bằng cách thay thế các khối trích xuất đặc trưng phức tạp bằng cấu trúc nhẹ hơn, vẫn giữ được cơ chế tái sử dụng đặc trưng và ổn định gradient. Một số thành phần attention có chi phí tính toán cao được loại bỏ, trong khi cơ chế **CBAM** được tích hợp tại các vị trí chiến lược nhằm giúp mô hình tập trung tốt hơn vào vùng chứa triệu chứng bệnh trên lá.

Những điều chỉnh này không nhằm tạo ra một kiến trúc hoàn toàn mới, mà tập trung vào việc tái cấu trúc có chọn lọc, phù hợp với bài toán nông nghiệp và mục tiêu triển khai thực tế.

## Kết quả thực nghiệm và phân tích

Các thí nghiệm được thực hiện trên nền tảng GPU NVIDIA Tesla P100 và đánh giá thêm trên CPU cũng như thiết bị di động tầm trung. Kết quả cho thấy **YOLOv10n-VT đạt mAP@50 ở mức 93.9%**, chỉ thấp hơn nhẹ so với YOLOv10n tiêu chuẩn, nhưng lại vượt trội về Precision và Recall so với các mô hình YOLO gọn nhẹ khác.

Đáng chú ý, mô hình chỉ có **2.3 triệu tham số** với dung lượng **4.9 MB**, đạt tốc độ suy luận nhanh nhất trong các mô hình được so sánh. Trên thiết bị di động tầm trung, YOLOv10n-VT vẫn duy trì khả năng xử lý gần thời gian thực, cho thấy tính khả thi khi triển khai ngoài hiện trường.

Những kết quả này cho thấy việc tối ưu kiến trúc có chủ đích, kết hợp với dữ liệu bản địa hóa, có thể mang lại hiệu quả rõ rệt mà không cần đánh đổi quá nhiều về độ chính xác.

## Triển khai thực tế và giá trị ứng dụng

Một điểm nhấn quan trọng của nghiên cứu là việc triển khai mô hình YOLOv10n-VT trên ứng dụng di động. Thông qua camera của thiết bị, người dùng có thể nhận diện bệnh lá cà chua trực tiếp tại ruộng, hỗ trợ phát hiện sớm và đưa ra biện pháp xử lý kịp thời.

Giải pháp này hướng tới việc hỗ trợ nông dân, kỹ sư nông nghiệp và các hệ thống nông nghiệp thông minh trong việc giám sát cây trồng, giảm thiểu thiệt hại kinh tế và nâng cao hiệu quả sản xuất.

## Hướng phát triển trong tương lai

Trong tương lai, chúng tôi dự định mở rộng nghiên cứu theo hai hướng chính. Thứ nhất là áp dụng phương pháp tương tự cho các cây trồng quan trọng khác tại Việt Nam như lúa, xoài, cam hay hồ tiêu. Thứ hai là tích hợp hệ thống nhận diện bệnh với cơ sở dữ liệu nông nghiệp và các mô hình dự báo dịch hại, hướng tới xây dựng một nền tảng AI hỗ trợ ra quyết định trong nông nghiệp thông minh.

**YOLOv10n-VT** không chỉ là một mô hình phát hiện đối tượng, mà là một bước đi hướng tới việc đưa AI đến gần hơn với sản xuất nông nghiệp thực tế tại Việt Nam.

<div style="text-align: center; margin: 2rem 0;">
  <img src="/research/paper-vnict.jpg" alt="Báo cáo nghiên cứu tại hội thảo" style="max-width: 600px; width: 100%; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15);" />
  <p style="margin-top: 0.8rem; color: #666; font-style: italic;">Báo cáo kết quả nghiên cứu được in trong kỷ yếu VNICT 2025</p>
</div>

---

*Nghiên cứu được thực hiện tại Trường Đại học Công nghệ TP.HCM, và được trình bày tại VNICT 2025 - Hội nghị quốc gia lần thứ XXVII về Công nghệ Thông tin và Truyền thông, tổ chức tại Ninh Bình.*