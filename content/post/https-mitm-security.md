+++
title = "Bảo mật mạng trong ứng dụng Java & JavaScript: từ HTTPS đến Man-in-the-Middle"
date = 2025-12-22T01:20:00+07:00
draft = false
categories = ["Security", "Java", "JavaScript", "Network"]
tags = ["HTTPS", "TLS", "SSL", "Security", "Man-in-the-Middle", "Java", "JavaScript", "Encryption"]
series = ["Network Programming"]
difficulty = "intermediate"
description = "Phân tích sâu về HTTPS, TLS và tấn công Man-in-the-Middle trong ứng dụng Java và JavaScript. Hiểu rõ vì sao HTTPS không còn là tùy chọn mà là yêu cầu bắt buộc"
image = "images/https-security.jpg"
+++

## HTTPS - Hơn cả một chữ S

Khi mình mới bắt đầu làm web, thường nghĩ HTTPS chỉ là HTTP thêm bảo mật, một tính năng "tốt là có" cho các website ngân hàng hay thương mại điện tử. Website blog cá nhân hay landing page đơn giản dùng HTTP cũng không sao. Nhưng càng đi sâu vào bảo mật mạng, mình mới thấy suy nghĩ đó ngây thơ đến mức nào.

HTTPS không phải là một giao thức riêng biệt. Nó chính là HTTP chạy bên trên một lớp bảo mật gọi là TLS (Transport Layer Security), trước đây gọi là SSL (Secure Sockets Layer). Về bản chất, khi bạn truy cập `https://example.com`, trình duyệt không trực tiếp gửi HTTP request lên server. Thay vào đó, nó thiết lập kết nối TLS trước, sau đó mới gửi dữ liệu HTTP qua kết nối đã được mã hóa này.

TLS hoạt động ở giữa tầng Transport (TCP) và tầng Application (HTTP). Nó tạo ra một đường hầm mã hóa cho luồng dữ liệu. Mọi thứ đi qua đường hầm này đều được mã hóa, từ HTTP headers đến request body, response data, cookies, tokens. Người quan sát trên mạng chỉ thấy được chuỗi ký tự vô nghĩa đã mã hóa, không thể đọc được nội dung thực.

## Vì sao HTTP thuần túy nguy hiểm

HTTP là giao thức văn bản thuần (plaintext). Khi bạn gửi request, mọi thứ được truyền đi dưới dạng text thuần túy qua mạng. Username, password, dữ liệu cá nhân, session tokens - tất cả đều lộ rõ cho bất kỳ ai có thể chặn lưu lượng mạng.

Hồi còn học đại học, mình từng dùng Wireshark để bắt packets trên WiFi của trường. Chỉ trong vài phút, mình có thể thấy hàng chục HTTP requests từ các bạn trong lớp. Một website không dùng HTTPS để đăng nhập, mình thấy rõ username và password trong POST request body. Cookies của Facebook, session IDs của các forums - tất cả đều bị lộ.

Điều đáng sợ là không cần phải là hacker để làm điều này. Bất kỳ ai ngồi chung WiFi công cộng với bạn đều có thể bắt lưu lượng mạng. Starbucks, sân bay, khách sạn - những nơi này là mỏ vàng cho kẻ tấn công. Họ chỉ cần dựng một WiFi access point với tên giống WiFi chính thức, đợi người dùng kết nối vào, và âm thầm bắt toàn bộ HTTP traffic.

## Man-in-the-Middle attack - Khi kẻ thứ ba chen vào

Tấn công Man-in-the-Middle (MITM) còn nguy hiểm hơn việc nghe lén thụ động. Trong cuộc tấn công này, kẻ tấn công không chỉ quan sát lưu lượng mà còn có thể chỉnh sửa nó. Họ đặt mình ở giữa client và server, chặn requests từ client, có thể sửa đổi rồi chuyển tiếp đến server. Tương tự, response từ server cũng đi qua kẻ tấn công trước khi đến client.

Cách hoạt động cụ thể như thế này. Giả sử bạn đang kết nối vào `http://bank.com`. Request của bạn phải đi qua router, ISP, có thể qua nhiều điểm trung gian trước khi đến server. Kẻ tấn công có thể xâm nhập bất kỳ điểm nào trên đường đi này. Khi request đến máy của kẻ tấn công, họ có toàn quyền đọc và sửa đổi.

Một kịch bản phổ biến là ARP spoofing trên mạng nội bộ. Kẻ tấn công gửi các thông điệp ARP giả mạo để lừa các thiết bị nghĩ rằng máy của họ là gateway router. Mọi lưu lượng từ nạn nhân đều được định tuyến qua máy của kẻ tấn công trước. Họ có thể thay đổi giá trong các yêu cầu thương mại điện tử, chèn script độc hại vào HTML responses, hoặc đơn giản là đánh cắp thông tin đăng nhập.

Với HTTP, không có cách nào để client xác minh rằng response thực sự đến từ server hợp lệ. Client gửi request đến địa chỉ IP, nhận response từ IP đó, và tin tưởng response. Nhưng nếu kẻ tấn công kiểm soát routing hoặc DNS, họ có thể điều hướng lưu lượng đến server giả mạo của họ. Client không có cách phân biệt.

## TLS và chuỗi tin cậy certificate

TLS giải quyết vấn đề này thông qua mã hóa và certificate authorities. Khi client kết nối đến HTTPS server, server phải xuất trình một chứng chỉ số (digital certificate). Certificate này chứa public key của server và được ký bởi một Certificate Authority (CA) đáng tin cậy.

Browser có danh sách các CA đáng tin cậy được tích hợp sẵn. Khi nhận certificate từ server, browser xác minh chữ ký của CA. Nếu chữ ký hợp lệ và CA nằm trong danh sách đáng tin cậy, browser tin rằng certificate xác thực. Lúc này, client và server thực hiện key exchange protocol (thường là Diffie-Hellman hoặc RSA) để thiết lập một shared secret. Shared secret này dùng để mã hóa tất cả giao tiếp sau đó.

Điều quan trọng là kẻ tấn công không thể làm giả certificate. Để tạo certificate hợp lệ cho `bank.com`, họ cần private key của một CA. Nhưng các CA bảo vệ private keys của họ vô cùng nghiêm ngặt. Nếu một CA bị xâm nhập, trình duyệt hiện đại sẽ thu hồi lòng tin đối với CA đó.

Ngay cả khi kẻ tấn công có thể chặn TLS traffic, họ chỉ thấy dữ liệu đã mã hóa. Không có private key của server, họ không thể giải mã. Nếu họ cố chỉnh sửa dữ liệu đã mã hóa, kiểm tra tính toàn vẹn sẽ thất bại và kết nối bị ngắt. Client sẽ thấy lỗi thay vì nhận dữ liệu bị hỏng.

## HTTPS trong Java server applications

Khi phát triển Java backend, bật TLS là một phần thiết yếu của thiết lập production. Java sử dụng keystores để quản lý certificates và private keys. Keystore là một file mã hóa chứa certificates và keys, được bảo vệ bởi password.

Để thiết lập HTTPS trong Java application server như Tomcat, bạn cần tạo hoặc lấy một certificate. Trong development, bạn có thể tự tạo self-signed certificate bằng keytool:

```bash
keytool -genkeypair -alias myserver -keyalg RSA -keysize 2048 \
    -validity 365 -keystore keystore.jks -storepass changeit
```

Lệnh này tạo một RSA key pair và self-signed certificate, lưu chúng trong `keystore.jks`. Trong production, thay vì self-signed cert, bạn sẽ yêu cầu certificate từ một CA đáng tin cậy như Let's Encrypt, DigiCert, hoặc Comodo.

Cấu hình Tomcat để dùng keystore:

```xml
<Connector port="8443" protocol="org.apache.coyote.http11.Http11NioProtocol"
           maxThreads="150" SSLEnabled="true">
    <SSLHostConfig>
        <Certificate certificateKeystoreFile="conf/keystore.jks"
                     certificateKeystorePassword="changeit"
                     type="RSA" />
    </SSLHostConfig>
</Connector>
```

Với Spring Boot, configuration còn đơn giản hơn trong `application.properties`:

```properties
server.port=8443
server.ssl.key-store=classpath:keystore.jks
server.ssl.key-store-password=changeit
server.ssl.key-store-type=JKS
server.ssl.key-alias=myserver
```

Khi server khởi động, Java's SSL/TLS implementation (JSSE - Java Secure Socket Extension) xử lý toàn bộ TLS handshake, mã hóa và giải mã. Application code của bạn không cần biết gì về underlying encryption. Bạn vẫn đọc request và gửi response như bình thường, JSSE tự động mã hóa/giải mã ở phía dưới.

Một best practice quan trọng là buộc chuyển hướng sang HTTPS. Nếu người dùng vô tình truy cập `http://example.com`, server nên chuyển hướng đến `https://example.com`. Trong Spring Security:

```java
@Configuration
public class SecurityConfig extends WebSecurityConfigurerAdapter {
    @Override
    protected void configure(HttpSecurity http) throws Exception {
        http.requiresChannel()
            .anyRequest()
            .requiresSecure(); // Force HTTPS
    }
}
```

## JavaScript và các hạn chế bảo mật của browser

Phía client, JavaScript trong browser cũng có những hạn chế nghiêm ngặt liên quan đến HTTPS. Trình duyệt hiện đại triển khai nhiều tính năng bảo mật chỉ khả dụng khi trang được phục vụ qua HTTPS.

Service Workers, một công nghệ cho Progressive Web Apps và chức năng offline, hoàn toàn yêu cầu HTTPS. Browser không cho đăng ký service workers từ HTTP pages (trừ localhost cho development). Lý do là service workers có quyền chặn network requests và chỉnh sửa responses. Nếu kẻ tấn công có thể chèn malicious service worker qua HTTP, họ có thể kiểm soát toàn bộ các requests tiếp theo của người dùng.

Geolocation API, camera và microphone access, clipboard API, payment request API - tất cả đều yêu cầu HTTPS. Browser không muốn các quyền nhạy cảm này được cấp cho các trang có thể không an toàn. Nếu trang được phục vụ qua HTTP, kẻ tấn công có thể chỉnh sửa JavaScript để lạm dụng những quyền này.

Cookies với flag `Secure` chỉ được gửi qua HTTPS connections. Đây là cách bảo vệ session cookies khỏi bị đánh cắp qua HTTP. Khi đặt cookie:

```javascript
document.cookie = "sessionId=abc123; Secure; HttpOnly; SameSite=Strict";
```

Flag `Secure` đảm bảo rằng ngay cả khi người dùng vô tình truy cập HTTP version của site, session cookie sẽ không được gửi. `HttpOnly` ngăn JavaScript truy cập (bảo vệ khỏi XSS), và `SameSite=Strict` ngăn cookie được gửi trong cross-site requests (bảo vệ khỏi CSRF).

HTTP Strict Transport Security (HSTS) là một cơ chế mà server có thể ra lệnh cho browser "luôn luôn dùng HTTPS cho domain này". Server gửi header:

```http
Strict-Transport-Security: max-age=31536000; includeSubDomains
```

Browser sẽ nhớ chỉ thị này trong 31536000 giây(1 năm). Trong thời gian đó, mọi nỗ lực truy cập HTTP version sẽ tự động chuyển hướng sang HTTPS ngay ở browser, không cần round-trip đến server. Điều này ngăn chặn một loại tấn công MITM gọi là SSL stripping, nơi kẻ tấn công hạ cấp kết nối HTTPS xuống HTTP.

## Mixed content và browser warnings

Một vấn đề phổ biến khi migrate từ HTTP sang HTTPS là mixed content. Nếu HTTPS page load resources (scripts, stylesheets, images) qua HTTP, browser sẽ block hoặc warn. Lý do là ngay cả khi main page secure, HTTP resources có thể bị modified bởi attacker, compromise toàn bộ page.

Ví dụ, nếu HTTPS page include:

```html
<script src="http://cdn.example.com/jquery.js"></script>
```

Browser sẽ block script này. Attacker có thể MITM connection đến CDN và inject malicious code vào jQuery. Dù main page được deliver securely, injected script có full access để steal data.

Modern browsers classify mixed content thành hai loại. Passive mixed content (images, audio, video) được load nhưng có warning. Active mixed content (scripts, stylesheets, fonts) bị block hoàn toàn. Để fix, bạn phải đảm bảo tất cả resources loaded qua HTTPS hoặc use protocol-relative URLs:

```html
<script src="//cdn.example.com/jquery.js"></script>
```

Protocol-relative URLs inherit protocol của parent page. Nếu page là HTTPS, resource cũng được load qua HTTPS.

## Certificate validation và trust issues

Mặc dù TLS provide strong security, nó rely on certificate validation. Nếu client không properly validate certificates, security bị compromise. Một mistake phổ biến trong Java code là disable certificate validation trong development rồi quên enable lại trong production.

Mình từng thấy code như này trong production:

```java
// DANGER: Disable certificate validation
TrustManager[] trustAllCerts = new TrustManager[] {
    new X509TrustManager() {
        public X509Certificate[] getAcceptedIssuers() { return null; }
        public void checkClientTrusted(X509Certificate[] certs, String authType) {}
        public void checkServerTrusted(X509Certificate[] certs, String authType) {}
    }
};

SSLContext sc = SSLContext.getInstance("SSL");
sc.init(null, trustAllCerts, new java.security.SecureRandom());
HttpsURLConnection.setDefaultSSLSocketFactory(sc.getSocketFactory());
```

Code này accept bất kỳ certificate nào, kể cả self-signed hay expired certs. Điều này hoàn toàn defeat TLS security. Attacker có thể present fake certificate và client sẽ happily accept.

Proper certificate validation check nhiều thứ: certificate chưa expire, issued bởi trusted CA, issued cho đúng domain (Common Name hoặc Subject Alternative Names match), certificate chain valid, certificate chưa bị revoke. Java's default SSL implementation làm tất cả checks này, nhưng developers đôi khi disable vì "certificate errors" trong development.

Better approach là use proper certificates ngay cả trong development. Let's Encrypt provide free certificates, hoặc bạn có thể setup internal CA cho organization. Nếu thực sự cần self-signed certs trong dev, add chúng vào Java's truststore thay vì disable validation hoàn toàn.

## Certificate pinning - Extra security layer

Đối với high-security applications, certificate pinning provide thêm một layer protection. Thay vì trust bất kỳ CA nào trong system trust store, application chỉ accept certificates signed bởi specific CA hoặc chỉ accept một specific certificate.

Concept là application "pin" expected certificate hoặc public key. Khi connect đến server, nếu presented certificate không match pinned certificate, connection bị reject ngay cả khi certificate valid theo normal validation rules.

Trong Android development với Java/Kotlin:

```java
CertificatePinner certificatePinner = new CertificatePinner.Builder()
    .add("api.example.com", "sha256/AAAAAAAAAAAABBBBBBBBBBBBCCCCCCCCCCCC=")
    .build();

OkHttpClient client = new OkHttpClient.Builder()
    .certificatePinner(certificatePinner)
    .build();
```

Pinning protect khỏi compromised CAs. Nếu một CA bị hack và issue fake certificate cho `api.example.com`, normal validation sẽ accept certificate đó. Nhưng với pinning, app detect rằng certificate không match pinned value và refuse connection.

Downside của pinning là nó make certificate rotation khó hơn. Khi server certificate expire và được renew, pinned value change. Apps đã deployed sẽ fail connect. Bạn cần plan ahead, pin multiple certificates (current và backup), và update pins trước khi certificates expire.

## Performance considerations của TLS

Một concern phổ biến về HTTPS là performance overhead. TLS handshake require additional round-trips, encryption/decryption consume CPU. Nhưng trong practice, overhead này minimal với modern hardware và optimized implementations.

TLS 1.3, latest version, reduce handshake từ 2 round-trips xuống 1 round-trip so với TLS 1.2. Điều này cut latency đáng kể cho connection establishment. Session resumption cho phép clients reuse previous session keys, skip full handshake entirely cho subsequent connections.

Modern CPUs có AES-NI (Advanced Encryption Standard New Instructions), tăng tốc phần cứng cho mã hóa AES. Với AES-NI, overhead mã hóa gần như không đáng kể. Servers có thể xử lý hàng nghìn kết nối TLS mà CPU usage chỉ tăng vài phần trăm.

HTTP/2, yêu cầu HTTPS trong hầu hết triển khai browser, thực ra cải thiện hiệu suất so với HTTP/1.1. Multiplexing, header compression, server push đều đóng góp vào việc tải trang nhanh hơn. Trong nhiều tests, HTTPS với HTTP/2 nhanh hơn HTTP thuần túy với HTTP/1.1.

Google và các đại gia công nghệ khác đã chứng minh rằng HTTPS overhead không đáng kể. Google báo cáo rằng chuyển Gmail sang HTTPS chỉ thêm dưới 1% server load và không có tác động đáng chú ý đến trải nghiệm người dùng.

## HTTPS không còn là tùy chọn

Năm 2018, Google Chrome bắt đầu đánh dấu tất cả HTTP sites là "Not Secure" trong address bar. Firefox, Safari, Edge đều làm theo. Người dùng nhìn thấy cảnh báo rõ ràng khi truy cập HTTP sites. Điều này tạo động lực mạnh mẽ cho chủ site chuyển sang HTTPS.

Let's Encrypt, một certificate authority miễn phí, đã loại bỏ rào cản chi phí của HTTPS. Certificate renewal có thể tự động hóa qua ACME protocol. Không còn lẽ bào nào để không dùng HTTPS.

Công cụ tìm kiếm như Google ưu tiên HTTPS sites trong xếp hạng. HTTP sites bị phạt. Từ góc độ kinh doanh, không dùng HTTPS nghĩa là mất traffic và doanh thu.

Các nhà cung cấp browser đang dần ngừng hỗ trợ các tính năng cho HTTP. Chrome đã thông báo rằng các tính năng mạnh sẽ yêu cầu secure contexts. Trong tương lai, có thể HTTP sẽ bị xem như giao thức lỗi thời, chỉ dùng cho hệ thống cũ.

Từ góc nhìn developer, HTTPS phải là lựa chọn mặc định. Khi bắt đầu dự án mới, thiết lập HTTPS ngay từ đầu. Đừng đợi đến khi launch rồi mới chuyển đổi, vì việc chuyển đổi có thể gây hỏng và đòi hỏi nỗ lực lớn. Môi trường development nên phản ánh production càng nhiều càng tốt, bao gồm cả HTTPS.

## Kết luận

HTTPS và TLS không phải là "tính năng thêm" hay "tốt là có". Chúng là yêu cầu cơ bản cho bất kỳ ứng dụng web nào xử lý dữ liệu người dùng. Các cuộc tấn công Man-in-the-Middle không phải là mối đe dọa lý thuyết - chúng xảy ra mỗi ngày trên mạng WiFi công cộng, routers bị xâm nhập, và các ISP độc hại.

HTTP lộ mọi thứ dưới dạng văn bản thuần. Passwords, thông tin cá nhân, session tokens - tất cả lộ rõ cho kẻ tấn công. TLS mã hóa giao tiếp, xác minh danh tính server, và đảm bảo tính toàn vẹn dữ liệu. Đây không phải là kịch bảo mật, mà là các biện pháp bảo vệ thiết yếu mà người dùng xứng đáng được có.

Trong Java applications, việc kích hoạt TLS đơn giản với keystores và SSL configurations. Các tính năng bảo mật của browser ngày càng yêu cầu HTTPS, từ service workers đến các APIs mạnh. Overhead hiệu suất của TLS tối thiểu và được bù bổi các cải tiến như HTTP/2.

Là developers, trách nhiệm của chúng ta là bảo vệ dữ liệu người dùng. HTTPS là mức tối thiểu. Không triển khai HTTPS trong năm 2025 không chỉ là thiếu trách nhiệm mà còn có thể để lộ người dùng trước các cuộc tấn công. Các công cụ và hạ tầng sẵn có để làm cho HTTPS dễ dàng và miễn phí. Không còn lý do gì để không dùng nó.

---

**Tham khảo:**

- RFC 8446 (TLS 1.3)
- OWASP Transport Layer Protection Cheat Sheet
- "Bulletproof SSL and TLS" - Ivan Ristić
- Let's Encrypt Documentation
- MDN Web Security Documentation
