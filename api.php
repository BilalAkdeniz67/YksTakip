<?php
// NATRO MYSQL VERİTABANI BİLGİLERİNİZ
$host = 'localhost';          // Genellikle localhost kalır
$dbname = 'VERITABANI_ADI';   // Natro panelinden oluşturduğunuz veritabanı adı
$user = 'KULLANICI_ADI';      // Veritabanı kullanıcısı
$pass = 'SIFRE';              // Veritabanı şifresi

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *'); // Farklı domainlerden erişime izin ver

try {
    // Veritabanına PDO ile bağlan
    $pdo = new PDO("mysql:host=$host;dbname=$dbname;charset=utf8", $user, $pass);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    // Uygulama durumunu tutacağımız tabloyu otomatik oluştur (Eğer yoksa)
    $pdo->exec("CREATE TABLE IF NOT EXISTS app_state (
        id INT PRIMARY KEY,
        json_data LONGTEXT NOT NULL
    )");
    
    // Gelen isteğin türünü belirle (load veya save)
    $action = isset($_GET['action']) ? $_GET['action'] : '';
    
    if ($action === 'load') {
        // Veritabanından veriyi çek
        $stmt = $pdo->query("SELECT json_data FROM app_state WHERE id = 1");
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if ($row) {
            echo $row['json_data'];
        } else {
            echo json_encode(["status" => "empty"]);
        }
    } 
    elseif ($action === 'save') {
        // Gelen JSON verisini oku
        $json = file_get_contents('php://input');
        
        // Geçerli bir JSON olup olmadığını kontrol et
        if (json_decode($json) === null) {
            echo json_encode(["status" => "error", "message" => "Geçersiz veri gönderildi"]);
            exit;
        }
        
        // Veriyi kaydet (Varsa güncelle, yoksa oluştur)
        $stmt = $pdo->prepare("INSERT INTO app_state (id, json_data) VALUES (1, ?) ON DUPLICATE KEY UPDATE json_data = ?");
        $stmt->execute([$json, $json]);
        
        echo json_encode(["status" => "success"]);
    } 
    else {
        echo json_encode(["status" => "error", "message" => "Geçersiz islem. Lutfen action parametresi gonderin (load/save)."]);
    }
} catch(PDOException $e) {
    echo json_encode(["status" => "error", "message" => "Veritabani hatasi: " . $e->getMessage()]);
}
?>
