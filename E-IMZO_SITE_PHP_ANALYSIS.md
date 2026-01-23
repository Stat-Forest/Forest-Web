# E-IMZO test.e-imzo.uz/demo/site.php: Texnik Tahlil va Kod

## 1. Saytning Umumiy Tuzilishi

### HTML Struktura:

```html
<!DOCTYPE html>
<html>
<head>
  <title>E-IMZO Demo</title>
  <!-- E-IMZO JavaScript kutubxonalari -->
  <script src="https://test.e-imzo.uz/demo/e-imzo.js"></script>
  <script src="https://test.e-imzo.uz/demo/e-imzo-client.js"></script>
</head>
<body>
  <div id="container">
    <!-- Login form -->
    <button onclick="checkEimzo()">E-IMZO orqali kirish</button>
    <button onclick="listCertificates()">Sertifikatlarni ko'rsatish</button>
    <button onclick="signData()">Ma'lumotni imzolash</button>
  </div>
</body>
</html>
```

### JavaScript Flow:

```javascript
// ============================================
// STEP 1: E-IMZO Client'ni yuklash va tekshirish
// ============================================

window.addEventListener('DOMContentLoaded', function() {
  // E-IMZO client yuklangandan keyin
  if (window.EIMZOClient && window.CAPIWS) {
    initializeEimzo();
  } else {
    console.error('E-IMZO client yuklanmadi');
  }
});

// ============================================
// STEP 2: CAPIWS Service bilan bog'lanish
// ============================================

function initializeEimzo() {
  // API keys ni o'rnatish
  window.EIMZOClient.API_KEYS = [
    'localhost',
    'API_KEY_1',
    '127.0.0.1',
    'API_KEY_2',
    // ... boshqa keys
  ];

  // CAPIWS versiyasini tekshirish
  window.EIMZOClient.checkVersion(
    function(major, minor) {
      console.log('CAPIWS version:', major, minor);
      // Versiya 3.37+ bo'lishi kerak
      if (major * 100 + minor >= 337) {
        installApiKeys();
      } else {
        alert('E-IMZO versiyasi eski. Yangilang.');
      }
    },
    function(error) {
      console.error('CAPIWS topilmadi:', error);
      alert('E-IMZO xizmati ishlamayapti. Iltimos, E-IMZO dasturini o\'rnating.');
    }
  );
}

// ============================================
// STEP 3: API Keys ni o'rnatish
// ============================================

function installApiKeys() {
  window.EIMZOClient.installApiKeys(
    function() {
      console.log('API keys o\'rnatildi');
      // Keyin sertifikatlarni topish
      findAndListCertificates();
    },
    function(error) {
      console.error('API keys o\'rnatilmadi:', error);
      alert('API keys o\'rnatilmadi. Xatolik: ' + error);
    }
  );
}

// ============================================
// STEP 4: USB-token va PFX fayllarni topish
// ============================================

function findAndListCertificates() {
  // Avval USB-tokenlarni topish
  if (window.CAPIWS && window.CAPIWS.findTokens) {
    window.CAPIWS.findTokens(
      function() {
        console.log('USB-tokenlar topildi');
        // Keyin PFX fayllarni topish
        if (window.CAPIWS.findPfxs) {
          window.CAPIWS.findPfxs(
            function() {
              console.log('PFX fayllar topildi');
              // Ikkalasini ham topgandan keyin ro'yxatga olish
              listAllCertificates();
            },
            function(error) {
              console.warn('PFX fayllar topilmadi:', error);
              // PFX topilmasa ham, USB-tokenlar bilan davom etish
              listAllCertificates();
            }
          );
        } else {
          listAllCertificates();
        }
      },
      function(error) {
        console.warn('USB-tokenlar topilmadi:', error);
        // USB-token topilmasa, PFX fayllarni sinab ko'rish
        if (window.CAPIWS && window.CAPIWS.findPfxs) {
          window.CAPIWS.findPfxs(
            function() {
              listAllCertificates();
            },
            function() {
              listAllCertificates();
            }
          );
        } else {
          listAllCertificates();
        }
      }
    );
  } else {
    // findTokens mavjud emas, to'g'ridan-to'g'ri ro'yxatga olish
    listAllCertificates();
  }
}

// ============================================
// STEP 5: Barcha sertifikatlarni ro'yxatga olish
// ============================================

function listAllCertificates() {
  window.EIMZOClient.listAllUserKeys(
    // ID generator
    function(item, index) {
      return 'cert-' + item.serialNumber + '-' + index;
    },
    // UI generator
    function(id, item) {
      const now = new Date();
      const validTo = new Date(item.validTo);
      const expired = validTo < now;

      return {
        id: id,
        label: expired 
          ? item.CN + ' (muddati tugagan)' 
          : item.CN,
        disabled: expired,
        data: item,
        type: item.type // "ftjc" yoki "pfx"
      };
    },
    // Success callback
    function(items, firstId) {
      console.log('Topilgan sertifikatlar:', items);
      
      // USB-token va E-imzo ni ajratish
      const usbTokens = items.filter(item => item.data.type === 'ftjc');
      const eimzoKeys = items.filter(item => item.data.type === 'pfx');
      
      console.log('USB-tokenlar:', usbTokens.length);
      console.log('E-imzo keylar:', eimzoKeys.length);
      
      // UI ga ko'rsatish
      displayCertificates(items);
    },
    // Fail callback
    function(error) {
      console.error('Sertifikatlar ro\'yxatga olinmadi:', error);
      alert('Sertifikatlar topilmadi. USB-token yoki E-IMZO dasturini tekshiring.');
    }
  );
}

// ============================================
// STEP 6: Sertifikatlarni UI ga ko'rsatish
// ============================================

function displayCertificates(certificates) {
  const container = document.getElementById('certificates-list');
  container.innerHTML = '';

  certificates.forEach(cert => {
    const div = document.createElement('div');
    div.className = 'certificate-item';
    div.innerHTML = `
      <div>
        <strong>${cert.label}</strong>
        <br>
        <small>Type: ${cert.data.type === 'ftjc' ? 'USB-token' : 'E-imzo (PFX)'}</small>
        <br>
        <small>TIN: ${cert.data.TIN}</small>
      </div>
      <button 
        onclick="selectCertificate('${cert.id}')"
        ${cert.disabled ? 'disabled' : ''}
      >
        Tanlash
      </button>
    `;
    container.appendChild(div);
  });
}

// ============================================
// STEP 7: Sertifikatni tanlash va yuklash
// ============================================

function selectCertificate(certId) {
  const certificate = certificates.find(c => c.id === certId);
  if (!certificate) {
    alert('Sertifikat topilmadi');
    return;
  }

  // Sertifikatni yuklash (PIN so'raladi)
  window.EIMZOClient.loadKey(
    certificate.data,
    function(keyId) {
      console.log('Sertifikat yuklandi, keyId:', keyId);
      // keyId ni saqlash, keyinchalik imzolash uchun ishlatiladi
      window.currentKeyId = keyId;
      window.currentCertificate = certificate;
      
      alert('Sertifikat yuklandi. Endi ma\'lumotni imzolashingiz mumkin.');
    },
    function(error) {
      console.error('Sertifikat yuklanmadi:', error);
      if (error && error.includes('BadPaddingException')) {
        alert('Noto\'g\'ri PIN kiritildi');
      } else {
        alert('Sertifikat yuklanmadi: ' + error);
      }
    }
  );
}

// ============================================
// STEP 8: Ma'lumotni imzolash (PKCS#7)
// ============================================

function signData(dataToSign) {
  if (!window.currentKeyId) {
    alert('Avval sertifikatni tanlang va yuklang');
    return;
  }

  // PKCS#7 imzo yaratish
  window.EIMZOClient.createPkcs7(
    window.currentKeyId,
    dataToSign, // Imzolanadigan ma'lumot
    null,       // Timestamper (ixtiyoriy)
    function(pkcs7) {
      console.log('PKCS#7 imzo yaratildi');
      // pkcs7 - base64-encoded PKCS#7 signature
      
      // Backend ga yuborish
      sendToBackend(pkcs7, window.currentCertificate.data);
    },
    function(error) {
      console.error('Imzo yaratilmadi:', error);
      if (error && error.includes('BadPaddingException')) {
        alert('Noto\'g\'ri PIN');
      } else {
        alert('Imzo yaratilmadi: ' + error);
      }
    }
  );
}

// ============================================
// STEP 9: Backend ga yuborish
// ============================================

function sendToBackend(pkcs7, certificateData) {
  // USB-token uchun "vo" yuborilmaydi
  const isUsbToken = certificateData.type === 'ftjc';
  
  const payload = {
    pkcs7: pkcs7
  };
  
  // Faqat E-imzo (PFX) uchun "vo" qo'shiladi
  if (!isUsbToken) {
    payload.vo = certificateData;
  }

  fetch('/api/authentications/login/eimzo/', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  })
  .then(response => response.json())
  .then(data => {
    if (data.access) {
      // Muvaffaqiyatli kirish
      localStorage.setItem('access_token', data.access);
      window.location.href = '/main';
    } else {
      alert('Kirish muvaffaqiyatsiz');
    }
  })
  .catch(error => {
    console.error('Xatolik:', error);
    alert('Server bilan aloqa xatoligi');
  });
}

// ============================================
// To'liq misol: E-IMZO orqali kirish
// ============================================

function loginWithEimzo() {
  // 1. E-IMZO ni tekshirish
  if (!window.EIMZOClient || !window.CAPIWS) {
    alert('E-IMZO client yuklanmadi');
    return;
  }

  // 2. Sertifikatlarni ro'yxatga olish
  listAllCertificates();

  // 3. Foydalanuvchi sertifikatni tanlaydi (UI da)
  // 4. selectCertificate() chaqiriladi
  // 5. Foydalanuvchi "Kirish" ni bosadi
  // 6. signData() chaqiriladi
  // 7. Backend ga yuboriladi
}
```

---

## 2. CAPIWS WebSocket Communication

### WebSocket Connection Flow:

```javascript
// CAPIWS WebSocket client qanday ishlaydi:

// 1. Local service portini aniqlash
function findCAPIWSPort() {
  // CAPIWS odatda localhost da ishlaydi
  // Port dinamik yoki ma'lum portda bo'lishi mumkin
  // e-imzo.js avtomatik portni topadi
}

// 2. WebSocket ulanish
const ws = new WebSocket('ws://localhost:PORT');

ws.onopen = function() {
  console.log('CAPIWS ga ulandi');
};

ws.onmessage = function(event) {
  const response = JSON.parse(event.data);
  // Response ni qayta ishlash
};

// 3. Request yuborish
function sendCAPIWSRequest(method, params, callback) {
  const request = {
    id: generateId(),
    method: method,
    params: params
  };
  
  ws.send(JSON.stringify(request));
  
  // Response ni kutish
  ws.onmessage = function(event) {
    const response = JSON.parse(event.data);
    if (response.id === request.id) {
      callback(response.result);
    }
  };
}

// 4. Misol: Sertifikatlarni olish
sendCAPIWSRequest('list_all_user_keys', {}, function(items) {
  console.log('Sertifikatlar:', items);
});
```

### CAPIWS Methods:

```javascript
// CAPIWS to'g'ridan-to'g'ri ishlatish:

// 1. Versiya tekshirish
window.CAPIWS.apiversion(
  function(major, minor) {
    console.log('Version:', major, minor);
  },
  function(error) {
    console.error('Xatolik:', error);
  }
);

// 2. API keys o'rnatish
window.CAPIWS.installApiKeys(
  ['localhost', 'API_KEY_1', '127.0.0.1', 'API_KEY_2'],
  function() {
    console.log('API keys o\'rnatildi');
  },
  function(error) {
    console.error('Xatolik:', error);
  }
);

// 3. USB-tokenlarni topish
window.CAPIWS.findTokens(
  function() {
    console.log('USB-tokenlar topildi');
  },
  function(error) {
    console.error('USB-tokenlar topilmadi:', error);
  }
);

// 4. PFX fayllarni topish
window.CAPIWS.findPfxs(
  function() {
    console.log('PFX fayllar topildi');
  },
  function(error) {
    console.error('PFX fayllar topilmadi:', error);
  }
);

// 5. Barcha sertifikatlarni olish
window.CAPIWS.list_all_user_keys(
  function(items) {
    console.log('Sertifikatlar:', items);
    items.forEach(item => {
      console.log('CN:', item.CN);
      console.log('TIN:', item.TIN);
      console.log('Type:', item.type); // "ftjc" yoki "pfx"
    });
  },
  function(error) {
    console.error('Xatolik:', error);
  }
);

// 6. Sertifikatni yuklash (PIN so'raladi)
window.CAPIWS.load_key(
  certificateItem, // Certificate object
  function(keyId) {
    console.log('Key yuklandi, ID:', keyId);
    // keyId ni saqlash
  },
  function(error) {
    if (error.includes('BadPaddingException')) {
      alert('Noto\'g\'ri PIN');
    } else {
      alert('Xatolik: ' + error);
    }
  }
);

// 7. PKCS#7 imzo yaratish
window.CAPIWS.create_pkcs7(
  keyId,        // load_key dan olingan
  'Data to sign', // Imzolanadigan ma'lumot
  null,         // Timestamper (ixtiyoriy)
  function(pkcs7) {
    console.log('PKCS#7:', pkcs7);
    // pkcs7 - base64-encoded string
  },
  function(error) {
    console.error('Xatolik:', error);
  }
);
```

---

## 3. To'liq Working Example (site.php style)

### HTML + JavaScript:

```html
<!DOCTYPE html>
<html lang="uz">
<head>
  <meta charset="UTF-8">
  <title>E-IMZO Demo</title>
  <script src="https://test.e-imzo.uz/demo/e-imzo.js"></script>
  <script src="https://test.e-imzo.uz/demo/e-imzo-client.js"></script>
  <style>
    body { font-family: Arial; padding: 20px; }
    .cert-item { border: 1px solid #ccc; padding: 10px; margin: 10px 0; }
    button { padding: 10px 20px; margin: 5px; cursor: pointer; }
    .error { color: red; }
    .success { color: green; }
  </style>
</head>
<body>
  <h1>E-IMZO Demo</h1>
  
  <div id="status"></div>
  
  <button onclick="initEimzo()">E-IMZO ni boshlash</button>
  <button onclick="listCerts()">Sertifikatlarni ko'rsatish</button>
  
  <div id="certificates"></div>
  
  <div id="sign-section" style="display:none;">
    <h2>Ma'lumotni imzolash</h2>
    <input type="text" id="dataToSign" placeholder="Imzolanadigan ma'lumot" />
    <button onclick="sign()">Imzolash</button>
  </div>

  <script>
    let certificates = [];
    let currentKeyId = null;
    let currentCert = null;

    // E-IMZO API keys
    const API_KEYS = [
      'localhost',
      '96D0C1491615C82B9A54D9989779DF825B690748224C2B04F500F370D51827CE2644D8D4A82C18184D73AB8530BB8ED537269603F61DB0D03D2104ABF789970B',
      '127.0.0.1',
      'A7BCFA5D490B351BE0754130DF03A068F855DB4333D43921125B9CF2670EF6A40370C646B90401955E1F7BC9CDBF59CE0B2C5467D820BE189C845D0B79CFC96F'
    ];

    function showStatus(message, type = 'info') {
      const status = document.getElementById('status');
      status.className = type;
      status.textContent = message;
    }

    function initEimzo() {
      if (!window.EIMZOClient || !window.CAPIWS) {
        showStatus('E-IMZO client yuklanmadi', 'error');
        return;
      }

      showStatus('E-IMZO tekshirilmoqda...', 'info');

      // API keys ni o'rnatish
      window.EIMZOClient.API_KEYS = API_KEYS;

      // Versiya tekshirish
      window.EIMZOClient.checkVersion(
        function(major, minor) {
          const version = major * 100 + minor;
          if (version >= 337) {
            showStatus('E-IMZO versiyasi: ' + major + '.' + minor, 'success');
            installKeys();
          } else {
            showStatus('E-IMZO versiyasi eski. Yangilang.', 'error');
          }
        },
        function(error) {
          showStatus('CAPIWS topilmadi: ' + error, 'error');
        }
      );
    }

    function installKeys() {
      window.EIMZOClient.installApiKeys(
        function() {
          showStatus('API keys o\'rnatildi', 'success');
          findTokens();
        },
        function(error) {
          showStatus('API keys xatolik: ' + error, 'error');
        }
      );
    }

    function findTokens() {
      if (window.CAPIWS.findTokens) {
        window.CAPIWS.findTokens(
          function() {
            console.log('USB-tokenlar topildi');
            if (window.CAPIWS.findPfxs) {
              window.CAPIWS.findPfxs(
                function() {
                  console.log('PFX fayllar topildi');
                  listCerts();
                },
                function() {
                  listCerts();
                }
              );
            } else {
              listCerts();
            }
          },
          function() {
            if (window.CAPIWS.findPfxs) {
              window.CAPIWS.findPfxs(
                function() {
                  listCerts();
                },
                function() {
                  listCerts();
                }
              );
            } else {
              listCerts();
            }
          }
        );
      } else {
        listCerts();
      }
    }

    function listCerts() {
      showStatus('Sertifikatlar yuklanmoqda...', 'info');

      window.EIMZOClient.listAllUserKeys(
        function(item, index) {
          return 'cert-' + item.serialNumber + '-' + index;
        },
        function(id, item) {
          const now = new Date();
          const validTo = new Date(item.validTo);
          const expired = validTo < now;

          return {
            id: id,
            label: expired ? item.CN + ' (muddati tugagan)' : item.CN,
            disabled: expired,
            data: item
          };
        },
        function(items, firstId) {
          certificates = items;
          showStatus('Topilgan sertifikatlar: ' + items.length, 'success');
          displayCerts(items);
        },
        function(error) {
          showStatus('Sertifikatlar topilmadi: ' + error, 'error');
        }
      );
    }

    function displayCerts(items) {
      const container = document.getElementById('certificates');
      container.innerHTML = '';

      if (items.length === 0) {
        container.innerHTML = '<p>Sertifikatlar topilmadi</p>';
        return;
      }

      items.forEach(cert => {
        const div = document.createElement('div');
        div.className = 'cert-item';
        div.innerHTML = `
          <h3>${cert.label}</h3>
          <p><strong>Type:</strong> ${cert.data.type === 'ftjc' ? 'USB-token' : 'E-imzo (PFX)'}</p>
          <p><strong>TIN:</strong> ${cert.data.TIN}</p>
          <p><strong>Organization:</strong> ${cert.data.O}</p>
          <p><strong>Valid to:</strong> ${new Date(cert.data.validTo).toLocaleDateString()}</p>
          <button 
            onclick="selectCert('${cert.id}')"
            ${cert.disabled ? 'disabled' : ''}
          >
            Tanlash va yuklash
          </button>
        `;
        container.appendChild(div);
      });
    }

    function selectCert(certId) {
      const cert = certificates.find(c => c.id === certId);
      if (!cert) {
        showStatus('Sertifikat topilmadi', 'error');
        return;
      }

      showStatus('Sertifikat yuklanmoqda... PIN ni kiriting', 'info');

      window.EIMZOClient.loadKey(
        cert.data,
        function(keyId) {
          currentKeyId = keyId;
          currentCert = cert;
          showStatus('Sertifikat yuklandi! Endi ma\'lumotni imzolashingiz mumkin', 'success');
          document.getElementById('sign-section').style.display = 'block';
        },
        function(error) {
          if (error && error.includes('BadPaddingException')) {
            showStatus('Noto\'g\'ri PIN kiritildi', 'error');
          } else {
            showStatus('Sertifikat yuklanmadi: ' + error, 'error');
          }
        }
      );
    }

    function sign() {
      if (!currentKeyId) {
        showStatus('Avval sertifikatni tanlang', 'error');
        return;
      }

      const dataToSign = document.getElementById('dataToSign').value;
      if (!dataToSign) {
        showStatus('Imzolanadigan ma\'lumotni kiriting', 'error');
        return;
      }

      showStatus('Imzo yaratilmoqda...', 'info');

      window.EIMZOClient.createPkcs7(
        currentKeyId,
        dataToSign,
        null,
        function(pkcs7) {
          showStatus('PKCS#7 imzo yaratildi!', 'success');
          console.log('PKCS#7:', pkcs7);
          
          // Backend ga yuborish
          sendToBackend(pkcs7, currentCert.data);
        },
        function(error) {
          if (error && error.includes('BadPaddingException')) {
            showStatus('Noto\'g\'ri PIN', 'error');
          } else {
            showStatus('Imzo yaratilmadi: ' + error, 'error');
          }
        }
      );
    }

    function sendToBackend(pkcs7, certData) {
      const isUsbToken = certData.type === 'ftjc';
      
      const payload = {
        pkcs7: pkcs7
      };
      
      if (!isUsbToken) {
        payload.vo = certData;
      }

      showStatus('Backend ga yuborilmoqda...', 'info');

      fetch('/api/authentications/login/eimzo/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      })
      .then(response => response.json())
      .then(data => {
        if (data.access) {
          showStatus('Muvaffaqiyatli kirildi!', 'success');
          localStorage.setItem('access_token', data.access);
          setTimeout(() => {
            window.location.href = '/main';
          }, 1000);
        } else {
          showStatus('Kirish muvaffaqiyatsiz', 'error');
        }
      })
      .catch(error => {
        showStatus('Server xatolik: ' + error, 'error');
      });
    }

    // Sahifa yuklanganda avtomatik boshlash
    window.addEventListener('DOMContentLoaded', function() {
      // dates utility
      window.dates = {
        compare: function(a, b) {
          return (a > b) ? 1 : (a < b) ? -1 : 0;
        }
      };

      // E-IMZO client yuklangandan keyin
      setTimeout(function() {
        if (window.EIMZOClient) {
          initEimzo();
        } else {
          showStatus('E-IMZO client yuklanmadi. Sahifani yangilang.', 'error');
        }
      }, 1000);
    });
  </script>
</body>
</html>
```

---

## 4. CAPIWS Local Service Architecture

### Local Service (Native Application):

```cpp
// CAPIWS Service (C++ pseudo-code)

class CAPIWSService {
private:
    WebSocketServer* wsServer;
    SmartCardManager* cardManager;
    int port;

public:
    void start() {
        // WebSocket server ni ishga tushirish
        wsServer = new WebSocketServer("127.0.0.1", findAvailablePort());
        wsServer->onMessage = handleMessage;
        wsServer->start();
        
        // Smart Card manager ni ishga tushirish
        cardManager = new SmartCardManager();
        cardManager->onCardInserted = handleCardInserted;
        cardManager->start();
    }

    void handleMessage(WebSocketMessage msg) {
        JSON request = parseJSON(msg.data);
        
        if (request.method == "apiversion") {
            sendResponse({
                "major": 3,
                "minor": 37
            });
        }
        else if (request.method == "installApiKeys") {
            // API keys ni tekshirish va saqlash
            if (validateApiKeys(request.params.keys)) {
                saveApiKeys(request.params.keys);
                sendResponse({"success": true});
            } else {
                sendError("Invalid API keys");
            }
        }
        else if (request.method == "findTokens") {
            // USB-tokenlarni topish
            vector<USBToken> tokens = findUSBTokens();
            sendResponse({"tokens": tokens});
        }
        else if (request.method == "findPfxs") {
            // PFX fayllarni topish
            vector<PFXFile> pfxs = findPFXFiles();
            sendResponse({"pfxs": pfxs});
        }
        else if (request.method == "list_all_user_keys") {
            // Barcha sertifikatlarni olish
            vector<Certificate> certs = getAllCertificates();
            sendResponse({"certificates": certs});
        }
        else if (request.method == "load_key") {
            // Sertifikatni yuklash (PIN so'raladi)
            showPINDialog(request.params.certificate, [](pin) {
                if (verifyPIN(pin)) {
                    string keyId = loadCertificate(request.params.certificate, pin);
                    sendResponse({"keyId": keyId});
                } else {
                    sendError("Wrong PIN");
                }
            });
        }
        else if (request.method == "create_pkcs7") {
            // PKCS#7 imzo yaratish
            string pkcs7 = createPKCS7Signature(
                request.params.keyId,
                request.params.data
            );
            sendResponse({"pkcs7": base64_encode(pkcs7)});
        }
    }

    vector<Certificate> getAllCertificates() {
        vector<Certificate> certs;
        
        // USB-tokenlardan sertifikatlar
        vector<USBToken> tokens = findUSBTokens();
        for (auto token : tokens) {
            Certificate cert = readCertificateFromToken(token);
            cert.type = "ftjc";
            certs.push_back(cert);
        }
        
        // PFX fayllardan sertifikatlar
        vector<string> pfxPaths = findPFXFiles();
        for (auto path : pfxPaths) {
            Certificate cert = readCertificateFromPFX(path);
            cert.type = "pfx";
            certs.push_back(cert);
        }
        
        return certs;
    }
};
```

---

## 5. WebSocket Protocol Details

### Message Format:

```javascript
// Request format:
{
  "id": "request-123",
  "method": "list_all_user_keys",
  "params": {}
}

// Response format:
{
  "id": "request-123",
  "result": [...],
  "error": null
}

// Error format:
{
  "id": "request-123",
  "result": null,
  "error": "Error message"
}
```

### Connection Flow:

```
1. Browser → WebSocket handshake → CAPIWS Service
   GET / HTTP/1.1
   Upgrade: websocket
   Connection: Upgrade
   Sec-WebSocket-Key: ...
   
2. CAPIWS → 101 Switching Protocols
   HTTP/1.1 101 Switching Protocols
   Upgrade: websocket
   Connection: Upgrade
   Sec-WebSocket-Accept: ...
   
3. Browser ↔ CAPIWS (WebSocket messages)
   - JSON encoded requests/responses
   - Binary data for certificates/signatures
```

---

## 6. Security Implementation

### API Keys Authentication:

```javascript
// API keys nima uchun kerak?

// 1. Local service va browser o'rtasida autentifikatsiya
// 2. Faqat ruxsat berilgan saytlar CAPIWS ga kirishi mumkin
// 3. API keys .env yoki config faylda saqlanadi

const API_KEYS = [
  'localhost',        // Development
  'API_KEY_1',        // Production key 1
  '127.0.0.1',        // Localhost variant
  'API_KEY_2',        // Production key 2
  'domain.com',       // Allowed domain
  'API_KEY_3'         // Production key 3
];

// CAPIWS service API keys ni tekshiradi:
function validateApiKeys(keys) {
  // Keys ni whitelist bilan solishtiradi
  // Agar key whitelist da bo'lsa, ruxsat beriladi
  return keys.every(key => WHITELIST.includes(key));
}
```

### PIN Protection:

```javascript
// PIN qanday ishlaydi:

// 1. PIN faqat native dialog orqali so'raladi
// 2. PIN hech qachon browser ga yuborilmaydi
// 3. PIN faqat USB token ichida tekshiriladi

window.CAPIWS.load_key(
  certificate,
  function(keyId) {
    // PIN to'g'ri kiritildi
    // keyId olinadi (PIN yuborilmaydi)
  },
  function(error) {
    // PIN noto'g'ri yoki bekor qilindi
  }
);

// Native dialog (C++):
void showPINDialog() {
  // OS native dialog ko'rsatiladi
  // PIN faqat local service ga yuboriladi
  // Browser ga yuborilmaydi
}
```

---

## 7. Backend Verification (Python Example)

```python
from cryptography import x509
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import padding
from cryptography.hazmat.backends import default_backend
import base64
from pkcs7 import PKCS7Signature

def verify_eimzo_login(request):
    pkcs7_base64 = request.data.get('pkcs7')
    vo = request.data.get('vo')  # Only for PFX, not USB tokens
    
    try:
        # Decode PKCS#7
        pkcs7_bytes = base64.b64decode(pkcs7_base64)
        
        # Parse PKCS#7
        pkcs7 = PKCS7Signature.load_der(pkcs7_bytes)
        
        # Extract certificate
        signer_cert = pkcs7.get_signer_certificate()
        
        # Extract signed data
        signed_data = pkcs7.get_signed_data()
        
        # Extract signature
        signature = pkcs7.get_signature()
        
        # Verify signature
        public_key = signer_cert.public_key()
        public_key.verify(
            signature,
            signed_data.encode('utf-8'),
            padding.PKCS1v15(),
            hashes.SHA256()
        )
        
        # Extract user info
        subject = signer_cert.subject
        tin = get_attribute(subject, 'TIN')
        cn = get_attribute(subject, 'CN')
        
        # Find user
        user = User.objects.get(tin=tin)
        
        # Generate JWT
        access_token = generate_jwt(user)
        
        return {
            'access': access_token,
            'refresh': generate_refresh_token(user),
            'user_id': user.id,
            'role': user.role
        }
        
    except Exception as e:
        raise ValidationError('Signature verification failed: ' + str(e))
```

---

## 8. Xulosa

### test.e-imzo.uz/demo/site.php qanday ishlaydi:

1. **HTML sahifa** yuklanadi
2. **e-imzo.js** va **e-imzo-client.js** skriptlar yuklanadi
3. **CAPIWS service** localhost da ishlayotganini tekshiradi
4. **API keys** o'rnatiladi
5. **USB-tokenlar** va **PFX fayllar** topiladi
6. **Sertifikatlar** ro'yxatga olinadi va ko'rsatiladi
7. **Foydalanuvchi** sertifikatni tanlaydi
8. **PIN** so'raladi (native dialog)
9. **PKCS#7 imzo** yaratiladi
10. **Backend** ga yuboriladi va tekshiriladi
11. **JWT token** qaytariladi

### Asosiy komponentlar:

- **Browser**: JavaScript (e-imzo.js, e-imzo-client.js)
- **Local Service**: CAPIWS (WebSocket server)
- **USB Token**: Hardware (Smart Card)
- **Backend**: Signature verification

### Xavfsizlik:

- Private key hech qachon tokendan chiqmaydi
- PIN faqat native dialog orqali kiritiladi
- API keys autentifikatsiya uchun
- PKCS#7 standart imzo formati
