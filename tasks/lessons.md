# Bài Học Kinh Nghiệm (Lessons Learned)

## 1. Lỗi thiếu `jlink.exe` khi build Android với Gradle trong IDE
- **Hiện tượng**: Khi ấn Build project Android trong Antigravity IDE / VS Code, gặp lỗi:
  `Cause: jlink executable C:\Users\ADMIN\.antigravity-ide\extensions\redhat.java-1.56.0-win32-x64\jre\21.0.12.1-win32-x86_64\bin\jlink.exe does not exist.`
- **Nguyên nhân gốc rễ**:
  1. Tiện ích mở rộng `redhat.java` đi kèm một JRE rút gọn (Java 21) để chạy language server. JRE này đã bị cắt giảm các công cụ JDK như `jlink.exe` và thư mục `jmods`.
  2. Gradle 8.8+ / 9.x có file `gradle/gradle-daemon-jvm.properties` chỉ định `toolchainVersion=21`. Khi khởi chạy Gradle Daemon, Gradle tự động tìm Java 21 trên máy và chọn nhầm JRE rút gọn của tiện ích `redhat.java`.
  3. Khi tác vụ `:app:compileDebugJavaWithJavac` chạy, Gradle cố gắng tìm `jlink.exe` trong JRE đó để xử lý các mô-đun và biên dịch, dẫn đến báo lỗi không tồn tại `jlink.exe`.
  4. Trong khi đó, project đặt `compileOptions` là Java 17 và trên máy tính đã cài đặt đầy đủ bộ JDK chính thức: `C:\Program Files\Eclipse Adoptium\jdk-17.0.20.101-hotspot` (có đầy đủ `javac.exe`, `jlink.exe`, `jmods`).
- **Giải pháp xử lý triệt để**:
  1. Trong `gradle/gradle-daemon-jvm.properties`: Cập nhật `toolchainVersion=17` để khớp với JDK 17 đầy đủ.
  2. Trong `gradle.properties`: Trỏ rõ ràng `org.gradle.java.home=C:/Program Files/Eclipse Adoptium/jdk-17.0.20.101-hotspot`.
  3. Trong `.vscode/settings.json` (cả ở root và `mobilbe_app/.vscode/`): Cấu hình `java.jdt.ls.java.home`, `java.home`, `java.import.gradle.java.home`, `gradle.java.home` trỏ về `C:\\Program Files\\Eclipse Adoptium\\jdk-17.0.20.101-hotspot`.
  4. Dừng các Gradle daemon cũ (`gradlew --stop`) để Gradle tạo daemon mới sử dụng Adoptium JDK 17.
  5. Thêm `@chcp 65001 >nul` vào `gradlew.bat` để tránh lỗi đường dẫn tiếng Việt có dấu (`BÀi tập lớn`).
