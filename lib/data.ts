import { QuizSet } from "./types";

export const quizSets: QuizSet[] = [
  {
    id: "qthtm-190",
    name: "BỘ 190 CÂU QTHTM (Thầy Sáng)",
    description: "Bộ đề ôn tập QTHTM của Thầy Sáng - đầy đủ 190 câu",
    icon: "book-open",
    color: "#3b82f6",
    questions: [
      { id: "q190-1", question: "Mô hình OSI có bao nhiêu tầng?", answers: ["5 tầng", "6 tầng", "7 tầng", "8 tầng"], correct: 2, explanation: "Mô hình OSI có 7 tầng: Vật lý, Liên kết dữ liệu, Mạng, Giao vận, Phiên, Trình diễn, Ứng dụng." },
      { id: "q190-2", question: "Tầng nào trong mô hình OSI chịu trách nhiệm mã hóa dữ liệu?", answers: ["Tầng 3 - Mạng", "Tầng 4 - Giao vận", "Tầng 5 - Phiên", "Tầng 6 - Trình diễn"], correct: 3, explanation: "Tầng 6 (Trình diễn) chịu trách nhiệm mã hóa, giải mã, nén và chuyển đổi dữ liệu." },
      { id: "q190-3", question: "Địa chỉ IP nào sau đây là địa chỉ private?", answers: ["192.168.1.1", "8.8.8.8", "172.16.0.1", "Cả A và C đều đúng"], correct: 3, explanation: "192.168.x.x và 172.16.x.x - 172.31.x.x là dải địa chỉ private theo RFC 1918." },
      { id: "q190-4", question: "Port mặc định của HTTP là gì?", answers: ["21", "22", "80", "443"], correct: 2, explanation: "HTTP sử dụng port 80, HTTPS sử dụng port 443, FTP dùng 21, SSH dùng 22." },
      { id: "q190-5", question: "Thiết bị nào hoạt động ở tầng 3 (Network Layer)?", answers: ["Switch", "Hub", "Router", "Bridge"], correct: 2, explanation: "Router hoạt động ở tầng 3 - Network Layer, định tuyến gói tin dựa trên địa chỉ IP." },
      { id: "q190-6", question: "Giao thức nào là connection-oriented?", answers: ["UDP", "TCP", "ICMP", "IP"], correct: 1, explanation: "TCP (Transmission Control Protocol) là giao thức hướng kết nối, đảm bảo tin cậy. UDP là connectionless." },
      { id: "q190-7", question: "Subnet mask 255.255.255.0 tương đương với prefix length nào?", answers: ["/16", "/20", "/24", "/28"], correct: 2, explanation: "255.255.255.0 có 24 bit network (3 octet đầu = 24), tương đương /24." },
      { id: "q190-8", question: "DNS dùng để làm gì?", answers: ["Phân giải tên miền thành IP", "Truyền file", "Gửi email", "Mã hóa dữ liệu"], correct: 0, explanation: "DNS (Domain Name System) chuyển đổi tên miền thành địa chỉ IP." },
      { id: "q190-9", question: "DHCP là viết tắt của gì?", answers: ["Dynamic Host Configuration Protocol", "Data Host Control Protocol", "Direct Host Connection Protocol", "Dynamic Hyperlink Control Protocol"], correct: 0, explanation: "DHCP tự động cấp phát địa chỉ IP và các thông số mạng cho thiết bị." },
      { id: "q190-10", question: "Tầng nào của mô hình OSI sử dụng địa chỉ MAC?", answers: ["Tầng 1", "Tầng 2", "Tầng 3", "Tầng 4"], correct: 1, explanation: "Tầng 2 - Data Link Layer sử dụng địa chỉ MAC (Media Access Control) 48 bit." },
      { id: "q190-11", question: "Giao thức ARP dùng để?", answers: ["Phân giải IP thành MAC", "Phân giải MAC thành IP", "Chuyển file", "Gửi email"], correct: 0, explanation: "ARP (Address Resolution Protocol) ánh xạ địa chỉ IP sang địa chỉ MAC trong mạng LAN." },
      { id: "q190-12", question: "Default gateway là gì?", answers: ["Địa chỉ IP của router", "Địa chỉ DNS", "Địa chỉ MAC", "Subnet mask"], correct: 0, explanation: "Default gateway là địa chỉ IP của router, dùng để ra ngoài mạng LAN." },
      { id: "q190-13", question: "Cổng (port) nào dùng cho SSH?", answers: ["21", "22", "23", "25"], correct: 1, explanation: "SSH (Secure Shell) sử dụng port 22, Telnet dùng port 23, FTP port 21." },
      { id: "q190-14", question: "Giao thức HTTPS hoạt động ở port nào?", answers: ["80", "443", "8080", "3306"], correct: 1, explanation: "HTTPS (HTTP Secure) dùng port 443 với mã hóa TLS/SSL." },
      { id: "q190-15", question: "Switch và Hub khác nhau như thế nào?", answers: ["Switch không chuyển mạch", "Switch chuyển mạch theo MAC", "Hub nhanh hơn", "Không khác nhau"], correct: 1, explanation: "Switch hoạt động ở tầng 2, chuyển mạch theo địa chỉ MAC. Hub hoạt động ở tầng 1, gửi đến tất cả." },
      { id: "q190-16", question: "Tầng Transport của OSI tương ứng với tầng nào trong TCP/IP?", answers: ["Application", "Transport", "Internet", "Link"], correct: 1, explanation: "Tầng Transport (OSI) tương ứng với tầng Transport (TCP/IP) với TCP và UDP." },
      { id: "q190-17", question: "Một mạng có địa chỉ 192.168.1.0/24, có tối đa bao nhiêu host?", answers: ["254", "255", "256", "253"], correct: 0, explanation: "/24 = 256 địa chỉ, trừ network (192.168.1.0) và broadcast (192.168.1.255) = 254 host." },
      { id: "q190-18", question: "Giao thức nào dùng để gửi email giữa các mail server?", answers: ["SMTP", "POP3", "IMAP", "HTTP"], correct: 0, explanation: "SMTP (Simple Mail Transfer Protocol) dùng gửi mail giữa các server. POP3/IMAP dùng nhận mail." },
      { id: "q190-19", question: "Firewall hoạt động ở tầng nào?", answers: ["Tầng 1", "Tầng 3 và 4", "Tầng 7", "Tầng 2"], correct: 1, explanation: "Firewall thường hoạt động ở tầng 3 (Network) và 4 (Transport), lọc gói tin theo IP và port." },
      { id: "q190-20", question: "Giao thức ICMP được dùng để?", answers: ["Truyền file", "Thông báo lỗi mạng, ping", "Mã hóa dữ liệu", "Quản lý DHCP"], correct: 1, explanation: "ICMP (Internet Control Message Protocol) dùng thông báo lỗi và tiện ích như ping, traceroute." },
      { id: "q190-21", question: "NAT (Network Address Translation) dùng để?", answers: ["Tăng tốc mạng", "Chuyển đổi địa chỉ IP private sang public", "Mã hóa dữ liệu", "Phân giải DNS"], correct: 1, explanation: "NAT cho phép nhiều thiết bị dùng IP private truy cập internet qua 1 IP public." },
      { id: "q190-22", question: "Tầng Application trong TCP/IP tương ứng với những tầng nào trong OSI?", answers: ["Tầng 7", "Tầng 5, 6, 7", "Tầng 1-4", "Tầng 3, 4"], correct: 1, explanation: "Tầng Application (TCP/IP) gộp 3 tầng cuối của OSI: 5 (Phiên), 6 (Trình diễn), 7 (Ứng dụng)." },
      { id: "q190-23", question: "Mã hóa đối xứng (Symmetric Encryption) là gì?", answers: ["Dùng 1 key cho mã hóa và giải mã", "Dùng 2 key khác nhau", "Không dùng key", "Chỉ mã hóa 1 chiều"], correct: 0, explanation: "Mã hóa đối xứng dùng cùng 1 khóa để mã hóa và giải mã (VD: AES, DES)." },
      { id: "q190-24", question: "SSL/TLS hoạt động ở tầng nào?", answers: ["Tầng 3", "Tầng 4 (giữa TCP và App)", "Tầng 7", "Tầng 2"], correct: 1, explanation: "SSL/TLS nằm giữa tầng Transport và Application, mã hóa dữ liệu ứng dụng." },
      { id: "q190-25", question: "Load Balancer dùng để làm gì?", answers: ["Tăng cường bảo mật", "Phân phối tải giữa nhiều server", "Mã hóa dữ liệu", "Tăng tốc DNS"], correct: 1, explanation: "Load Balancer phân phối lưu lượng đều giữa các server để tránh quá tải." },
      { id: "q190-26", question: "VPN (Virtual Private Network) là gì?", answers: ["Mạng riêng ảo qua mạng công cộng", "Mạng cục bộ", "Mạng không dây", "Phần cứng mạng"], correct: 0, explanation: "VPN tạo đường hầm bảo mật qua internet để truy cập mạng riêng từ xa." },
      { id: "q190-27", question: "Giao thức FTP sử dụng bao nhiêu kết nối?", answers: ["1", "2", "3", "4"], correct: 1, explanation: "FTP dùng 2 kết nối: control (port 21) và data (port 20 hoặc dynamic)." },
      { id: "q190-28", question: "Địa chỉ IPv6 có bao nhiêu bit?", answers: ["32", "48", "64", "128"], correct: 3, explanation: "IPv6 sử dụng địa chỉ 128 bit, viết dạng 8 nhóm 4 chữ số hexa." },
      { id: "q190-29", question: "VLAN (Virtual LAN) dùng để?", answers: ["Tăng tốc internet", "Phân đoạn mạng logic", "Mã hóa dữ liệu", "Quản lý user"], correct: 1, explanation: "VLAN phân chia mạng LAN thành các phân đoạn logic độc lập, giảm broadcast domain." },
      { id: "q190-30", question: "Spanning Tree Protocol (STP) dùng để?", answers: ["Tăng tốc routing", "Ngăn loop mạng", "Mã hóa dữ liệu", "Cấp phát IP"], correct: 1, explanation: "STP ngăn chặn loop trong mạng có nhiều switch bằng cách block các port dự phòng." },
      { id: "q190-31", question: "Proxy server dùng để làm gì?", answers: ["Định tuyến gói tin", "Chặn/truy cập web thay cho client", "Tăng bandwidth", "Quản lý email"], correct: 1, explanation: "Proxy server đứng giữa client và internet, lọc request, cache, và ẩn IP thật." },
      { id: "q190-32", question: "Địa chỉ broadcast của mạng 192.168.10.0/24 là?", answers: ["192.168.10.1", "192.168.10.0", "192.168.10.255", "192.168.255.255"], correct: 2, explanation: "Với /24, broadcast là địa chỉ cuối cùng của subnet: 192.168.10.255." },
      { id: "q190-33", question: "Protocol nào dùng cho remote access?", answers: ["RDP", "HTTP", "SMTP", "FTP"], correct: 0, explanation: "RDP (Remote Desktop Protocol) dùng kết nối desktop từ xa. Port mặc định 3389." },
      { id: "q190-34", question: "Mô hình TCP/IP có bao nhiêu tầng?", answers: ["4", "5", "6", "7"], correct: 0, explanation: "TCP/IP có 4 tầng: Link, Internet, Transport, Application." },
      { id: "q190-35", question: "Switch có bao nhiêu bảng định hướng?", answers: ["MAC Address Table", "Routing Table", "ARP Table", "DNS Cache"], correct: 0, explanation: "Switch lưu MAC Address Table để forward frame đến đúng port dựa trên MAC." },
      { id: "q190-36", question: "CIDR (Classless Inter-Domain Routing) là gì?", answers: ["Phân chia mạng theo class cũ", "Phân chia mạng không theo class", "Giao thức định tuyến", "Loại mã hóa"], correct: 1, explanation: "CIDR cho phép phân chia mạng linh hoạt hơn class A/B/C truyền thống, dùng prefix length." },
      { id: "q190-37", question: "Syslog dùng để?", answers: ["Quản lý user", "Ghi log hệ thống tập trung", "Backup dữ liệu", "Monitor CPU"], correct: 1, explanation: "Syslog là giao thức gửi log từ thiết bị mạng đến server log tập trung." },
      { id: "q190-38", question: "802.1Q là chuẩn gì?", answers: ["Wi-Fi", "VLAN tagging", "Bluetooth", " Ethernet"], correct: 1, explanation: "802.1Q là chuẩn VLAN tagging cho phép mang thông tin VLAN trên trunk port." },
      { id: "q190-39", question: "HSRP (Hot Standby Router Protocol) dùng để?", answers: ["Tăng bandwidth", "Dự phòng gateway", "Load balancing", "Mã hóa dữ liệu"], correct: 1, explanation: "HSRP cung cấp dự phòng gateway bằng cách có router backup sẵn sàng thay thế." },
      { id: "q190-40", question: "Địa chỉ loopback (localhost) là?", answers: ["192.168.1.1", "127.0.0.1", "10.0.0.1", "255.255.255.0"], correct: 1, explanation: "127.0.0.1 là địa chỉ loopback, dùng để test stack mạng trên chính máy tính." },
    ],
  },
  {
    id: "qthtm-150",
    name: "150 CÂU (Thầy Sáng)",
    description: "Bộ 150 câu ôn thi QTHTM - Thầy Sáng",
    icon: "graduation-cap",
    color: "#06b6d4",
    questions: [
      { id: "q150-1", question: "Chức năng chính của Router là?", answers: ["Chuyển mạch frame theo MAC", "Định tuyến gói tin giữa các mạng", "Khuếch đại tín hiệu", "Mã hóa dữ liệu"], correct: 1, explanation: "Router định tuyến gói tin giữa các mạng khác nhau dựa trên bảng định tuyến." },
      { id: "q150-2", question: "Mô hình Client-Server là gì?", answers: ["Mọi máy đều ngang hàng", "Máy client gửi request, server xử lý và trả kết quả", "Chỉ có server gửi dữ liệu", "Không có server"], correct: 1, explanation: "Trong mô hình Client-Server, client gửi yêu cầu và server xử lý, trả kết quả." },
      { id: "q150-3", question: "Topology mạng nào có độ tin cậy cao nhất?", answers: ["Bus", "Ring", "Star", "Mesh"], correct: 3, explanation: "Topology Mesh có nhiều đường kết nối dự phòng, nếu 1 đường hỏng vẫn có đường khác." },
      { id: "q150-4", question: "Giao thức nào đảm bảo dữ liệu đến đích đúng thứ tự?", answers: ["UDP", "TCP", "ICMP", "IGMP"], correct: 1, explanation: "TCP đảm bảo trình tự dữ liệu, kiểm soát luồng và sửa lỗi." },
      { id: "q150-5", question: "Subnet mask 255.255.0.0 tương đương với?", answers: ["/8", "/16", "/24", "/32"], correct: 1, explanation: "255.255.0.0 = 16 bit network, tương đương /16." },
      { id: "q150-6", question: "Server DHCP cấp phát những gì cho client?", answers: ["Chỉ địa chỉ IP", "IP, subnet mask, gateway, DNS", "Chỉ DNS", "Chỉ gateway"], correct: 1, explanation: "DHCP cấp đầy đủ: IP, subnet mask, default gateway, DNS server, và các thông số khác." },
      { id: "q150-7", question: "Cáp quang (Fiber optic) truyền dữ liệu bằng?", answers: ["Tín hiệu điện", "Sóng vô tuyến", "Ánh sáng", "Từ trường"], correct: 2, explanation: "Cáp quang truyền dữ liệu bằng xung ánh sáng qua sợi thủy tinh hoặc plastic." },
      { id: "q150-8", question: "Địa chỉ MAC có bao nhiêu bit?", answers: ["32", "48", "64", "128"], correct: 1, explanation: "Địa chỉ MAC dài 48 bit, biểu diễn dạng 12 chữ số hexa (VD: 00:1A:2B:3C:4D:5E)." },
      { id: "q150-9", question: "Protocol OSPF dùng để?", answers: ["Chuyển file", "Định tuyến trong mạng nội bộ", "Gửi email", "Remote access"], correct: 1, explanation: "OSPF (Open Shortest Path First) là giao thức định tuyến link-state dùng trong mạng nội bộ (IGP)." },
      { id: "q150-10", question: "Router và Switch khác nhau ở điểm nào?", answers: ["Cùng tầng OSI", "Router dùng IP, Switch dùng MAC", "Giống nhau hoàn toàn", "Switch định tuyến được"], correct: 1, explanation: "Router hoạt động tầng 3 (IP), Switch hoạt động tầng 2 (MAC)." },
      { id: "q150-11", question: "Mạng LAN thường có phạm vi?", answers: ["Quốc gia", "Thành phố", "Tòa nhà, phòng ban", "Toàn cầu"], correct: 2, explanation: "LAN (Local Area Network) phạm vi nhỏ: tòa nhà, trường học, gia đình." },
      { id: "q150-12", question: "Giao thức POP3 dùng để?", answers: ["Gửi email", "Nhận email và lưu cục bộ", "Chuyển tiếp email", "Xóa email"], correct: 1, explanation: "POP3 (Post Office Protocol v3) tải email về máy client và xóa khỏi server." },
      { id: "q150-13", question: "Trunk port trong VLAN dùng để?", answers: ["Kết nối máy tính", "Truyền nhiều VLAN", "Tăng tốc mạng", "Backup dữ liệu"], correct: 1, explanation: "Trunk port cho phép đi qua nhiều VLAN trên 1 đường vật lý duy nhất." },
      { id: "q150-14", question: "Giao thức RIP hoạt động dựa trên?", answers: ["Link state", "Distance vector", "Path vector", "Flow control"], correct: 1, explanation: "RIP (Routing Information Protocol) là distance vector protocol, định tuyến dựa trên số hop." },
      { id: "q150-15", question: "Tường lửa (Firewall) có chức năng gì?", answers: ["Tăng tốc mạng", "Lọc lưu lượng theo quy tắc", "Thay thế router", "Mã hóa mạng"], correct: 1, explanation: "Firewall lọc lưu lượng vào/ra theo quy tắc, bảo vệ mạng khỏi truy cập trái phép." },
      { id: "q150-16", question: "Địa chỉ multicast dùng để?", answers: ["Gửi đến 1 máy", "Gửi đến tất cả máy trong mạng", "Gửi đến 1 nhóm máy", "Không dùng được"], correct: 2, explanation: "Địa chỉ multicast gửi dữ liệu đến một nhóm máy quan tâm trong mạng." },
      { id: "q150-17", question: "Sniffer dùng để làm gì?", answers: ["Tăng tốc mạng", "Bắt và phân tích gói tin", "Mã hóa dữ liệu", "Định tuyến gói tin"], correct: 1, explanation: "Sniffer là công cụ bắt và phân tích lưu lượng mạng, dùng cho quản trị hoặc tấn công." },
      { id: "q150-18", question: "Tầng Physical trong OSI truyền dữ liệu dạng?", answers: ["Frame", "Packet", "Bit", "Byte"], correct: 2, explanation: "Tầng 1 (Physical) truyền nhận dữ liệu dạng bit (0 và 1) qua phương tiện vật lý." },
      { id: "q150-19", question: "Cáp UTP Category 5e hỗ trợ tốc độ tối đa bao nhiêu?", answers: ["100 Mbps", "1 Gbps", "10 Gbps", "100 Gbps"], correct: 1, explanation: "Cat5e hỗ trợ tốc độ đến 1 Gbps, tần số 100 MHz, khoảng cách 100m." },
      { id: "q150-20", question: "Access Control List (ACL) dùng để?", answers: ["Tăng bandwidth", "Lọc lưu lượng theo quy tắc", "Mã hóa dữ liệu", "Cấp phát IP"], correct: 1, explanation: "ACL kiểm soát truy cập, lọc lưu lượng dựa trên IP, port, protocol." },
    ],
  },
  {
    id: "linux-350",
    name: "BỘ 350 CÂU LINUX (K13)",
    description: "Bộ đề Linux K13 - 350 câu trắc nghiệm",
    icon: "terminal",
    color: "#10b981",
    questions: [
      { id: "linux-1", question: "Lệnh nào để xem nội dung file trong Linux?", answers: ["cat", "ls", "cd", "mkdir"], correct: 0, explanation: "Lệnh `cat` hiển thị nội dung file. `ls` liệt kê file, `cd` đổi thư mục, `mkdir` tạo thư mục." },
      { id: "linux-2", question: "Lệnh nào tạo thư mục mới?", answers: ["touch", "mkdir", "rmdir", "create"], correct: 1, explanation: "`mkdir` (make directory) tạo thư mục mới. `touch` tạo file trống, `rmdir` xóa thư mục rỗng." },
      { id: "linux-3", question: "File permission trong Linux có bao nhiêu quyền?", answers: ["2", "3", "4", "5"], correct: 2, explanation: "Có 3 loại quyền: Read (r), Write (w), Execute (x) cho 3 đối tượng: Owner, Group, Others." },
      { id: "linux-4", question: "Lệnh chmod 755 có nghĩa là?", answers: ["rwx r-x r-x", "rwx rwx rwx", "rw- r-- r--", "r-x r-x r-x"], correct: 0, explanation: "755 = Owner rwx (7), Group rx (5), Others rx (5)." },
      { id: "linux-5", question: "Trong Linux, superuser có UID là?", answers: ["0", "1000", "500", "1"], correct: 0, explanation: "Root (superuser) có UID = 0. User thường có UID >= 1000." },
      { id: "linux-6", question: "File nào lưu thông tin user trong Linux?", answers: ["/etc/passwd", "/etc/shadow", "/etc/group", "/etc/fstab"], correct: 0, explanation: "/etc/passwd chứa thông tin tài khoản user. /etc/shadow lưu mật khẩu đã mã hóa." },
      { id: "linux-7", question: "Lệnh nào để xem tiến trình đang chạy?", answers: ["ps", "top", "kill", "bg"], correct: 0, explanation: "`ps` hiển thị snapshot tiến trình. `top` hiển thị realtime. `kill` dùng kết thúc tiến trình." },
      { id: "linux-8", question: "Package manager trên Debian/Ubuntu là?", answers: ["yum", "dnf", "apt", "rpm"], correct: 2, explanation: "Debian/Ubuntu dùng apt (Advanced Package Tool). Red Hat/CentOS dùng yum/dnf." },
      { id: "linux-9", question: "Lệnh grep dùng để?", answers: ["Tìm kiếm pattern trong file", "Sắp xếp file", "Đếm dòng", "Xóa file"], correct: 0, explanation: "grep (Global Regular Expression Print) tìm kiếm các dòng chứa pattern trong file." },
      { id: "linux-10", question: "Trong Linux, thư mục /etc thường chứa?", answers: ["File cấu hình hệ thống", "File cá nhân", "Thư viện hệ thống", "File tạm"], correct: 0, explanation: "/etc chứa file cấu hình hệ thống và ứng dụng. /home chứa file cá nhân user." },
      { id: "linux-11", question: "Lệnh nào để khởi động lại service trong systemd?", answers: ["service start", "systemctl restart", "systemctl stop", "init 6"], correct: 1, explanation: "systemctl restart <service> khởi động lại service trong systemd." },
      { id: "linux-12", question: "Lệnh `chmod 644 filename` có nghĩa là?", answers: ["rw-r--r--", "rwxr-xr-x", "rw-rw-rw-", "r--r--r--"], correct: 0, explanation: "644 = Owner rw (6), Group r (4), Others r (4). Không ai có quyền execute." },
      { id: "linux-13", question: "Daemon trong Linux là?", answers: ["Tiến trình chạy nền", "User thường", "File cấu hình", "Device driver"], correct: 0, explanation: "Daemon là tiến trình chạy nền, thường tự khởi động khi boot (VD: sshd, httpd)." },
      { id: "linux-14", question: "Lệnh nào xem dung lượng ổ đĩa?", answers: ["df", "du", "free", "ls"], correct: 0, explanation: "`df` (disk free) xem dung lượng filesystem. `du` (disk usage) xem dung lượng file/thư mục." },
      { id: "linux-15", question: "Mô hình phân quyền nào Linux sử dụng?", answers: ["RBAC", "DAC (Discretionary Access Control)", "MAC", "ABAC"], correct: 1, explanation: "Linux dùng DAC - mỗi file có chủ sở hữu tự quyết quyền truy cập." },
      { id: "linux-16", question: "File /etc/shadow chứa gì?", answers: ["Tên user", "Mật khẩu đã mã hóa", "Thông tin nhóm", "Quota người dùng"], correct: 1, explanation: "/etc/shadow lưu mật khẩu đã hash và thông tin hết hạn password." },
      { id: "linux-17", question: "Lệnh `useradd` dùng để?", answers: ["Xóa user", "Thêm user mới", "Sửa thông tin user", "Liệt kê user"], correct: 1, explanation: "`useradd` tạo tài khoản user mới. `userdel` xóa, `usermod` sửa." },
      { id: "linux-18", question: "Lệnh nào xem địa chỉ IP trên Linux?", answers: ["ipconfig", "ifconfig hoặc ip addr", "netstat", "ping"], correct: 1, explanation: "Linux dùng `ip addr` hoặc `ifconfig` (nếu cài net-tools) để xem IP." },
      { id: "linux-19", question: "Cron dùng để làm gì?", answers: ["Quản lý user", "Lập lịch tác vụ tự động", "Sao lưu dữ liệu", "Giám sát mạng"], correct: 1, explanation: "Cron là daemon lập lịch, tự động chạy lệnh/script theo thời gian định sẵn." },
      { id: "linux-20", question: "Lệnh `rm -rf /` có tác dụng gì?", answers: ["Xóa file tạm", "Xóa toàn bộ hệ thống", "Không làm gì", "Reboot"], correct: 1, explanation: "`rm -rf /` xóa đệ quy, force toàn bộ filesystem từ root - hệ thống sẽ bị phá hủy!" },
    ],
  },
  {
    id: "sai-la-toi",
    name: "SAI LÀ TỒI (25 câu điểm liệt)",
    description: "25 câu hỏi điểm liệt - nắm chắc để không mất điểm",
    icon: "alert-triangle",
    color: "#ef4444",
    questions: [
      { id: "slt-1", question: "Mô hình OSI có đúng 7 tầng?", answers: ["Đúng", "Sai, có 6 tầng", "Sai, có 8 tầng", "Tùy phiên bản"], correct: 0, explanation: "Mô hình OSI luôn có đúng 7 tầng." },
      { id: "slt-2", question: "Router hoạt động ở tầng 3 (Network Layer)?", answers: ["Đúng", "Sai, tầng 2", "Sai, tầng 4", "Sai, tầng 1"], correct: 0, explanation: "Router hoạt động ở tầng 3 - Network Layer." },
      { id: "slt-3", question: "HTTPS sử dụng port 443?", answers: ["Đúng", "Sai, port 80", "Sai, port 22", "Sai, port 21"], correct: 0, explanation: "HTTPS dùng port 443, HTTP dùng 80, SSH dùng 22, FTP control dùng 21." },
      { id: "slt-4", question: "Giao thức TCP là connection-oriented?", answers: ["Đúng", "Sai, UDP là connection-oriented", "Cả hai đều là", "Không có connection-oriented"], correct: 0, explanation: "TCP đảm bảo kết nối tin cậy, hướng kết nối. UDP là connectionless." },
      { id: "slt-5", question: "Địa chỉ 192.168.1.1 là địa chỉ private?", answers: ["Đúng", "Sai, đó là public", "Sai, đó là multicast", "Sai, không hợp lệ"], correct: 0, explanation: "192.168.x.x là dải private theo RFC 1918." },
      { id: "slt-6", question: "Switch hoạt động ở tầng 2 (Data Link)?", answers: ["Đúng", "Sai, tầng 3", "Sai, tầng 1", "Sai, tầng 4"], correct: 0, explanation: "Switch (không có VLAN/routing) hoạt động ở tầng 2, dùng MAC address." },
      { id: "slt-7", question: "DNS chuyển đổi tên miền thành địa chỉ IP?", answers: ["Đúng", "Sai, ngược lại", "DNS không chuyển đổi", "DNS chỉ dùng cho email"], correct: 0, explanation: "DNS (Domain Name System) phân giải tên miền sang IP." },
      { id: "slt-8", question: "DHCP tự động cấp phát địa chỉ IP?", answers: ["Đúng", "Sai, phải cấu hình thủ công", "DHCP chỉ cho DNS", "DHCP là firewall"], correct: 0, explanation: "DHCP (Dynamic Host Configuration Protocol) tự động cấp IP và các thông số mạng." },
      { id: "slt-9", question: "Subnet mask 255.255.255.0 = /24?", answers: ["Đúng", "Sai, = /16", "Sai, = /8", "Sai, = /32"], correct: 0, explanation: "255.255.255.0 có 24 bit network, tương đương prefix /24." },
      { id: "slt-10", question: "Mạng 192.168.1.0/24 có tối đa 254 host?", answers: ["Đúng", "Sai, có 255 host", "Sai, có 256 host", "Sai, có 253 host"], correct: 0, explanation: "256 địa chỉ - 2 (network + broadcast) = 254 host khả dụng." },
      { id: "slt-11", question: "Giao thức ICMP dùng cho ping?", answers: ["Đúng", "Sai, ping dùng TCP", "Không có giao thức ping", "Sai, ping dùng UDP"], correct: 0, explanation: "Ping sử dụng ICMP Echo Request/Reply để kiểm tra kết nối." },
      { id: "slt-12", question: "ARP phân giải IP thành MAC?", answers: ["Đúng", "Sai, ngược lại là RARP", "ARP chỉ dùng cho DNS", "ARP mã hóa dữ liệu"], correct: 0, explanation: "ARP (Address Resolution Protocol) ánh xạ IP → MAC trong LAN." },
      { id: "slt-13", question: "Firewall bảo vệ mạng bằng cách lọc lưu lượng?", answers: ["Đúng", "Sai, firewall tăng tốc mạng", "Sai, firewall không liên quan", "Sai, firewall chỉ mã hóa"], correct: 0, explanation: "Firewall lọc lưu lượng vào/ra theo quy tắc để bảo vệ mạng." },
      { id: "slt-14", question: "Default gateway thường là địa chỉ của router?", answers: ["Đúng", "Sai, là địa chỉ DNS", "Sai, là địa chỉ broadcast", "Sai, là địa chỉ mạng"], correct: 0, explanation: "Default gateway là IP của router, dùng để ra khỏi mạng LAN." },
      { id: "slt-15", question: "Tầng Transport trong OSI có TCP và UDP?", answers: ["Đúng", "Sai, có thêm ICMP", "Sai, tầng 3 mới có", "Sai, chỉ có UDP"], correct: 0, explanation: "Tầng Transport (tầng 4) có TCP (tin cậy) và UDP (nhanh, không tin cậy)." },
      { id: "slt-16", question: "SSH dùng port 22?", answers: ["Đúng", "Sai, port 23", "Sai, port 21", "Sai, port 3389"], correct: 0, explanation: "SSH (Secure Shell) port 22. Telnet port 23, FTP port 21, RDP port 3389." },
      { id: "slt-17", question: "VLAN phân chia mạng theo logic?", answers: ["Đúng", "Sai, VLAN chia theo vật lý", "VLAN không chia mạng", "Sai, VLAN tăng tốc mạng"], correct: 0, explanation: "VLAN chia mạng theo logic, không cần thay đổi cáp vật lý." },
      { id: "slt-18", question: "FTP sử dụng 2 kết nối: control và data?", answers: ["Đúng", "Sai, chỉ 1 kết nối", "Sai, dùng 3 kết nối", "Sai, FTP không có kết nối"], correct: 0, explanation: "FTP dùng port 21 cho control, port 20 cho data (hoặc dynamic port)." },
      { id: "slt-19", question: "Mã hóa bất đối xứng dùng 2 khóa?", answers: ["Đúng", "Sai, chỉ 1 khóa", "Sai, không dùng khóa", "Sai, dùng 3 khóa"], correct: 0, explanation: "Mã hóa bất đối xứng (RSA) dùng cặp khóa public/private." },
      { id: "slt-20", question: "Địa chỉ IPv6 dài 128 bit?", answers: ["Đúng", "Sai, 64 bit", "Sai, 32 bit", "Sai, 256 bit"], correct: 0, explanation: "IPv6 dùng 128 bit, cho phép không gian địa chỉ rất lớn." },
      { id: "slt-21", question: "Địa chỉ loopback là 127.0.0.1?", answers: ["Đúng", "Sai, là 192.168.1.1", "Sai, là 10.0.0.1", "Sai, là 255.255.255.0"], correct: 0, explanation: "127.0.0.1 là loopback address, dùng để test TCP/IP stack." },
      { id: "slt-22", question: "NAT chuyển đổi IP private sang public?", answers: ["Đúng", "Sai, ngược lại", "NAT không chuyển đổi IP", "Sai, NAT chỉ dùng cho DNS"], correct: 0, explanation: "NAT chuyển đổi IP private thành public để truy cập internet." },
      { id: "slt-23", question: "Load Balancer phân phối tải giữa các server?", answers: ["Đúng", "Sai, tăng tốc 1 server", "Sai, backup server", "Sai, mã hóa dữ liệu"], correct: 0, explanation: "Load Balancer phân phối request đều giữa các server, tránh quá tải." },
      { id: "slt-24", question: "SSL/TLS mã hóa dữ liệu giữa client và server?", answers: ["Đúng", "Sai, chỉ xác thực", "Sai, không mã hóa", "Sai, chỉ nén dữ liệu"], correct: 0, explanation: "SSL/TLS mã hóa dữ liệu truyền qua mạng, đảm bảo bí mật." },
      { id: "slt-25", question: "Mô hình TCP/IP có 4 tầng?", answers: ["Đúng", "Sai, có 5 tầng", "Sai, có 7 tầng", "Sai, có 3 tầng"], correct: 0, explanation: "TCP/IP có 4 tầng: Link, Internet, Transport, Application." },
    ],
  },
  {
    id: "ielts-1",
    name: "IELTS Academic Reading (2 Passages)",
    description: "IELTS Academic Reading: Passage 1 (Biological Clocks) + Passage 2 (Canterbury Farming)",
    icon: "globe",
    color: "#2563eb",
    questions: [],
    sections: [
      {
        id: "ielts-1-reading",
        name: "Reading Passage 1",
        type: "reading",
        description: "Biological Clocks - 8 MCQ",
        instructions: "Trac nghiem 4 dap an - format IELTS Academic Reading. Doc ky doan van truoc khi chon dap an.",
        duration: 20,
        passage: "The concept of biological clocks refers to internal mechanisms that regulate the timing of biological processes in living organisms. These endogenous timekeepers are found in nearly all life forms, from single-celled bacteria to complex multicellular organisms including humans. The most well-known biological clock in humans is the circadian rhythm, a roughly 24-hour cycle that governs sleep-wake patterns, hormone release, body temperature, and other vital functions.\n\nResearch in chronobiology has revealed that circadian rhythms are generated by molecular feedback loops involving specific clock genes. In mammals, the suprachiasmatic nucleus (SCN) - a tiny region in the hypothalamus - acts as the master pacemaker, coordinating the rhythms of cells throughout the body. Light exposure, particularly morning sunlight, is the strongest environmental cue that resets this master clock, which is why travelers experience jet lag when crossing time zones too quickly for their internal clocks to adjust.\n\nDisruption of circadian rhythms has been linked to numerous health problems, including sleep disorders, metabolic syndrome, cardiovascular disease, and certain cancers. Shift workers, who often sleep during daylight and work at night, have been shown to have higher rates of these conditions. Understanding biological clocks has therefore become a major focus of medical research, with scientists exploring chronotherapy - the timing of medical treatments to align with the body's natural rhythms - as a way to improve drug efficacy and reduce side effects.",
        questions: [
          { id: "ielts-r-1", question: "What is the main purpose of the passage?", answers: ["To describe how biological clocks were discovered", "To explain what biological clocks are and their importance for health", "To compare biological clocks in different species", "To argue against shift work"], correct: 1, explanation: "The passage introduces biological clocks, explains their mechanism, and discusses their health implications." },
          { id: "ielts-r-2", question: "According to the passage, the suprachiasmatic nucleus (SCN) is:", answers: ["A type of clock gene found in bacteria", "The master pacemaker in mammals", "A hormone released at night", "A disorder caused by jet lag"], correct: 1, explanation: "The passage states the SCN is a tiny region in the hypothalamus that acts as the master pacemaker in mammals." },
          { id: "ielts-r-3", question: "The word endogenous in paragraph 1 is closest in meaning to:", answers: ["External", "Internal", "Artificial", "Unknown"], correct: 1, explanation: "Endogenous means originating from within, consistent with the passage describing clocks as internal mechanisms." },
          { id: "ielts-r-4", question: "Which of the following is NOT mentioned as a health problem linked to circadian disruption?", answers: ["Sleep disorders", "Cancer", "Bone fractures", "Cardiovascular disease"], correct: 2, explanation: "Sleep disorders, cancer, and cardiovascular disease are all mentioned. Bone fractures are not." },
          { id: "ielts-r-5", question: "What is chronotherapy?", answers: ["A type of sleeping pill", "Timing medical treatments to align with body rhythms", "A method for resetting the SCN", "A new branch of genetics"], correct: 1, explanation: "The passage defines chronotherapy as the timing of medical treatments to align with the body's natural rhythms." },
          { id: "ielts-r-6", question: "Why do travelers experience jet lag?", answers: ["Their SCN is damaged", "Their internal clocks cannot adjust quickly enough to time zone changes", "They are exposed to too much sunlight", "They produce too many clock genes"], correct: 1, explanation: "Jet lag occurs when crossing time zones too quickly for the internal clocks to adjust." },
          { id: "ielts-r-7", question: "What does the passage suggest about shift workers?", answers: ["They never experience jet lag", "They have higher rates of certain health problems", "They do not have circadian rhythms", "They produce more hormones than other people"], correct: 1, explanation: "The passage states that shift workers have been shown to have higher rates of these conditions." },
          { id: "ielts-r-8", question: "The word pacemaker in paragraph 2 is closest in meaning to:", answers: ["A heart device", "A mechanism that controls timing", "A type of gene", "A medical treatment"], correct: 1, explanation: "In this context, pacemaker refers to the SCN coordinating rhythms - a timing control mechanism." },
        ],
      },
      {
        id: "ielts-1-reading-2",
        name: "Reading Passage 2",
        type: "reading",
        description: "The Changing Face of Farming - Canterbury, NZ",
        instructions: "Passage 2: Matching + Summary Completion. 20 minutes.",
        duration: 20,
        passage: "Reading Passage 2\n\nYou should spend about 20 minutes on Questions 14-26, which are based on Reading Passage, on pages 6 and 7.\n\nThe Changing Face of Farming in the Canterbury Region of New Zealand\n\nA\nThe landscape of the rural Canterbury plains in the South Island of New Zealand has been changing since Europeans first arrived in the country some 200 years ago, but in recent decades the speed of change has increased dramatically. Today it is terms such as 'mechanisation' 'intensification' and 'conversion' that you'll hear on a typical farm. Modern agriculture's rhythms are urgent, its scale corporate. Driving across the Canterbury plains today, there are futuristic grain research stations and slick billboards promoting harvest-boosting technologies.\n\nB\nLocal farmer Graham Robertson has both observed and participated in the reinvention of Canterbury agriculture. 'The list of changes is as long as your arm,' says Robertson. 'We used to grow one crop, but today we've got a huge variety including grass seeds, clover seeds, seeds for American golf courses, legumes ... One reason is that the big seed companies located in areas of the Northern Hemisphere want to diversify, and because Canterbury is in the Southern Hemisphere, we can grow crops out of season, and have proved ourselves at producing the quality they demand.' He does not lament the vanishing rural world, however. 'I admire the technology,' says Robertson. 'One complaint was that this new approach would likely result in a dust bowl. But good management practices have meant the soil isn't blowing away after all.'\n\nC\nToday, it's not plant pests and disease that are the problem, but shortage of water caused by the new popularity of dairy farming. Mid-Canterbury farmer Richard Johnson is a case in point. He converted from growing crops to dairy farming five years ago, because he could see himself getting left behind by neighbours who'd made the switch. He says, 'We thought, if we don't go through this process, eventually we are going to get taken over.' Water, which they found by boring 60 metres below the ground, is essential for the green grass needed by dairy cows. The crucial piece of equipment on the farm has become the high-tech mechanical irrigation system. Soil moisture monitors in the earth beneath each irrigation station signal exactly when they need to turn the water pumps on. Public perception is that this water is being wasted,' says Johnson. 'But farmers think long and hard before they turn the irrigation on, because it's expensive.\n\nD\nMurray Rogers, who heads the South Canterbury Water Trust, says that the unrestricted taking of water from local rivers has to be reconsidered. 'Reduced flow in the rivers means less dilution of pollutants and so we've been getting more toxic algal blooms,' says Rogers. He insists that the only long-term solution is for local government to take control of how much water farmers may take. Another critic is ecologist Colin Meurk, who argues that dairying has caused serious damage to Canterbury's biodiversity, waterways and indigenous ecosystems. He conducted a survey and found that precious little native habitat has survived - in terms of biodiversity Canterbury is 'one of the most diminished parts of the country.' However, Keith Woodford, professor of farm management at Lincoln University, doesn't accept that dairying is responsible for this problem with biodiversity. 'Much of the degradation you see in lowland areas is actually the result of practices going back to the 1960s,' he says, emphasising that modern farming techniques are not at fault.\n\nE\nWhat is not in dispute is the extent to which the region has been transformed. In the 1980s, the rural Canterbury town of Ashburton was often deserted but today you will find a bustling community. Whereas the surrounding land was once known as 'sheep country', today there's no question that the increasing popularity of dairy production has been the single greatest contributor to the region's newfound prosperity. However, the reversal of fortunes for rural Canterbury has other causes as well. In recent decades a significant portion of land has been given over to a relatively new industry: the production of wine, which has taken off in Canterbury and many other parts of the country. In addition, Canterbury's natural beauty has meant tourism has contributed to its prosperity for decades; and visitor numbers today are so high that the region's once quiet rural roads have never been so congested. Another important change is that more than 100,000 hectares of rural Canterbury are now divided into small blocks of land, tended by the so-called lifestylers - people who once lived in urban areas but have come to enjoy the rural culture and keep a few animals, though they usually have another source of income to support themselves.\n\nF\nBut with the transformation have come new stresses. Farmers whose families have been here for generations, and who are focused on the production of crops, don't necessarily relate well to these recent arrivals, with disputes arising over such issues as the intensification of farming and the heavy dependence on chemicals. The social mix is made even more complex because the modern rural workforce, once made up entirely of locals, is increasingly reliant on migrants who are brought in at harvest time, introducing a cosmopolitan element to Canterbury, at least for a few months of the year. With so many competing interests and so much disagreement about the best way forward, what happens next is anyone's guess.\n\n*dairy farming: keeping cows for the production of milk and milk products",
        questions: [
          {
            id: "ielts-r2-q1",
            question: "Questions 14-17: Which paragraph contains the following information? Write the correct letter, A-F, in boxes 14-17 on your answer sheet.",
            type: "matching",
            matchItems: [
              "14. an explanation of how water is distributed to plants in the right quantities",
              "15. some examples of current expressions used by Canterbury farmers",
              "16. an argument for increased regulation of agriculture in Canterbury",
              "17. a reference to an agricultural advantage Canterbury has over another part of the world",
            ],
            matchOptions: ["A", "B", "C", "D", "E", "F"],
            matchCorrect: ["C", "A", "D", "B"],
            answers: ["A", "B", "C", "D"],
            correct: 0,
            explanation: "14: Paragraph C (Richard Johnson describes soil moisture monitors and the irrigation system). 15: Paragraph A (mechanisation, intensification, conversion are terms you'll hear on a typical farm). 16: Paragraph D (Murray Rogers insists local government must control how much water farmers may take). 17: Paragraph B (Canterbury in the Southern Hemisphere can grow crops out of season for Northern Hemisphere seed companies).",
          },
          {
            id: "ielts-r2-q2",
            question: "Questions 18-21: Match each statement with the correct person.",
            type: "matching",
            matchItems: [
              "We changed our farm because of what people around us were doing.",
              "Today's problems with biodiversity have older origins than people realise.",
              "Farmers are more cautious about water use than non-farmers realise.",
              "The number of naturally occurring species has been seriously reduced by modern farming.",
            ],
            matchOptions: ["A. Graham Robertson", "B. Richard Johnson", "C. Murray Rogers", "D. Colin Meurk", "E. Keith Woodford"],
            matchCorrect: ["B", "E", "B", "D"],
            answers: ["A", "B", "C", "D"],
            correct: 0,
            explanation: "18: Richard Johnson converted to avoid being taken over. 19: Keith Woodford says degradation dates to the 1960s. 20: Johnson says farmers think long and hard before irrigating. 21: Colin Meurk found precious little native habitat survived.",
          },
          {
            id: "ielts-r2-q3",
            question: "Questions 22-26: Complete the summary below. Choose ONE WORD ONLY from the passage for each answer. The changing population of Ashburton - success of the ____ industry - ____ has brought wealth - group known as ____ - use of ____ on crops - ____ are temporarily employed.",
            type: "summary",
            matchItems: [
              "the success of the ___ industry in recent years",
              "For a long time ___ has brought wealth to the region",
              "a group known as ___ who have moved out from the city",
              "the use of ___ on crops",
              "___ are temporarily employed to work on farms",
            ],
            matchOptions: ["WINE", "TOURISM", "LIFESTYLERS", "CHEMICALS", "MIGRANTS"],
            matchCorrect: ["WINE", "TOURISM", "LIFESTYLERS", "CHEMICALS", "MIGRANTS"],
            answers: ["A", "B", "C", "D", "E"],
            correct: 0,
            explanation: "22: WINE. 23: TOURISM. 24: LIFESTYLERS. 25: CHEMICALS. 26: MIGRANTS.",
          },
        ],
      },
      {
        id: "ielts-1-speaking",
        name: "Speaking Part 1 - Introduction",
        type: "speaking",
        description: "Phan 1 IELTS Speaking - Gioi thieu ban than (4-5 phut)",
        instructions: "Tra loi cac cau hoi ve ban than. Day la Phan 1 trong bai thi IELTS Speaking -phan gioi thieu va hoi ve chu de quen thuoc. Hay noi that, chi tiet va lien quan den cau tra loi mau ben duoi.",
        duration: 5,
        questions: [
          { id: "ielts-s-1", question: "Introduce yourself: Give information about yourself such as your name, background, education, experience, and achievements.", answers: ["Good morning. My name is Nguyen Thi Van Khanh. I'm currently a final-year student majoring in English Language and Culture at the University of Languages and International Studies. I come from Bac Ninh.\n\nI have a strong passion for English language teaching and have nearly five years of experience working as a teaching assistant and private tutor for learners of different ages and backgrounds. Regarding my education, I have completed a Bachelor's degree in English Language and Culture with a strong academic performance. I will receive my graduation diploma this December. Additionally, I have completed a foreign language teaching pedagogy training course and obtained a teaching certificate with a focus on secondary and high school education at my university, ULIS.\n\nBesides my professional experience, I have been working as a private tutor since 2022, teaching both one-on-one and small groups. I have designed personalized lesson plans tailored to students' levels and learning goals, including exam preparation for high school students. Many of my students have shown significant improvement, with around 90% achieving better academic results, and several grade 12 students scoring between 8 and 9 or higher in the national university entrance exam.\n\nMoreover, I have worked as a teaching assistant, supporting ESL teachers in delivering lessons and managing classrooms. I also had the opportunity to complete my teaching practicum at a high school, where I directly taught English to grade 11 and 12 students in specialized classes. This experience helped me strengthen my classroom presence, lesson delivery, and ability to engage students effectively.\n\nIn addition, I have experience teaching Cambridge-based programs and designing interactive lessons that integrate games and technology to make learning more engaging and effective.\n\nMy strengths include strong communication skills, adaptability, and a student-centered teaching approach. I always strive to create a positive and motivating learning environment where students feel confident using English.\n\nIn the future, I aim to develop my career as a professional English teacher and continue improving my teaching skills to better support my students' learning journey.\n\nThank you for your attention.", "", "", ""], correct: 0 },
        ],
      },
    ],
  },
];

export const quizSetGroups = [
  { category: "Thầy Sáng", sets: ["qthtm-190", "qthtm-150"] },
  { category: "Linux", sets: ["linux-350"] },
  { category: "Điểm liệt", sets: ["sai-la-toi"] },
  { category: "IELTS", sets: ["ielts-1"] },
];

export function getQuizSet(setId: string): QuizSet | undefined {
  return quizSets.find((s) => s.id === setId);
}

export function getQuestionsForSet(setId: string, count?: number): import("./types").Question[] {
  const set = getQuizSet(setId);
  if (!set) return [];
  // Fisher-Yates: uniform distribution, no mutation of original
  const shuffled = [...set.questions];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  if (count && count < shuffled.length) {
    return shuffled.slice(0, count);
  }
  return shuffled;
}

export function getSubSets(setId: string): { id: string; name: string; questionCount: number; sectionType?: string }[] {
  const set = getQuizSet(setId);
  if (!set) return [];

  // IELTS-style sets use sections; each section becomes a selectable subset.
  if (set.sections && set.sections.length > 0) {
    return set.sections.map((s) => ({
      id: s.id,
      name: s.name,
      questionCount: s.questions.length,
      sectionType: s.type,
    }));
  }

  const total = set.questions.length;
  const subSets: { id: string; name: string; questionCount: number }[] = [];

  if (total <= 25) {
    return [{ id: `${setId}-all`, name: "Tất cả", questionCount: total }];
  }

  for (let i = 0; i < total; i += 20) {
    const chunkSize = Math.min(20, total - i);
    if (chunkSize < 10 && i > 0) {
      const last = subSets.pop();
      if (last) {
        subSets.push({ id: `${setId}-part-${Math.floor(i / 20) + 1}`, name: `Phần ${Math.floor(i / 20) + 1} (${last.questionCount + chunkSize} câu)`, questionCount: last.questionCount + chunkSize });
      }
      continue;
    }
    const partNum = Math.floor(i / 20) + 1;
    subSets.push({
      id: `${setId}-part-${partNum}`,
      name: `20 câu (phần ${partNum})`,
      questionCount: chunkSize,
    });
  }

  if (total > 40) {
    subSets.push({ id: `${setId}-mock`, name: "Thi thử (40 câu)", questionCount: 40 });
  }

  return subSets;
}
