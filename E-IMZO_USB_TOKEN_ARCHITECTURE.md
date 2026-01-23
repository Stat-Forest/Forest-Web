# E-IMZO USB Token Authentication: Technical Architecture Analysis

## 1. Overall Architecture

```
┌─────────────────┐
│   Browser       │
│  (JavaScript)   │
│                 │
│  window.CAPIWS  │◄─── e-imzo.js + e-imzo-client.js
│  window.EIMZO   │     (loaded from test.e-imzo.uz/demo/)
└────────┬────────┘
         │
         │ WebSocket (ws://localhost:PORT)
         │ or HTTP (http://localhost:PORT)
         │
┌────────▼────────────────────────────┐
│   Local E-IMZO Service              │
│   (CAPIWS - Cryptographic API       │
│    WebSocket Service)               │
│                                     │
│   - Runs on user's PC               │
│   - Listens on localhost            │
│   - Manages USB token communication │
└────────┬────────────────────────────┘
         │
         │ USB HID / CCID Protocol
         │ (via OS drivers)
         │
┌────────▼────────┐
│   USB Token     │
│  (ID-card,      │
│   BAIK-token)   │
│                 │
│  - Smart Card   │
│  - PIN protected│
│  - Certificate  │
│    storage      │
└─────────────────┘
         │
         │ PKCS#7 Signature
         │ (via CAPIWS)
         │
┌────────▼────────┐
│  Backend API    │
│  /login/eimzo/  │
│                 │
│  - Verifies     │
│    signature    │
│  - Returns JWT  │
└─────────────────┘
```

### Key Components:

1. **Browser JavaScript Layer**
   - `window.CAPIWS` - WebSocket client interface
   - `window.EIMZOClient` - High-level wrapper
   - Loaded from: `https://test.e-imzo.uz/demo/e-imzo.js`

2. **Local Service (CAPIWS)**
   - Native application running on user's PC
   - Communicates via WebSocket/HTTP on localhost
   - Handles USB token low-level operations
   - Manages PIN entry dialogs

3. **USB Token**
   - Physical smart card or USB token
   - Contains X.509 certificate and private key
   - Protected by PIN

4. **Backend Server**
   - Receives PKCS#7 signature
   - Verifies signature against certificate
   - Issues JWT access token

---

## 2. USB Token Detection

### Detection Flow:

```javascript
// Step 1: Check if CAPIWS service is available
if (window.CAPIWS) {
  // Step 2: Find USB tokens
  window.CAPIWS.findTokens(
    () => {
      // Success: USB tokens found
      // Step 3: Find PFX files (optional)
      window.CAPIWS.findPfxs(() => {
        // Step 4: List all available keys
        window.CAPIWS.list_all_user_keys(
          (items) => {
            // items contains both USB tokens and PFX files
            // USB tokens have: type: "ftjc"
            // PFX files have: type: "pfx"
          }
        );
      });
    },
    (error) => {
      // No USB tokens found or service unavailable
    }
  );
}
```

### Certificate Reading:

```javascript
// Each certificate item contains:
{
  serialNumber: string,      // Unique identifier
  CN: string,               // Common Name (owner name)
  TIN: string,              // Tax Identification Number
  UID: string,              // Unique ID
  PINFL?: string,           // Personal Identification Number
  O: string,                // Organization
  T: string,                // Title/Position
  validFrom: Date,          // Certificate validity start
  validTo: Date,            // Certificate validity end
  type: "ftjc" | "pfx",     // "ftjc" = USB token, "pfx" = file
  cardUID?: string,         // USB token card ID (if type === "ftjc")
  disk?: string,            // Disk path (if type === "pfx")
  path?: string             // File path (if type === "pfx")
}
```

### PIN Request:

```javascript
// When loading a key, CAPIWS automatically shows PIN dialog
window.CAPIWS.load_key(
  keyItem,  // Certificate object
  (keyId) => {
    // PIN entered successfully, key loaded
    // keyId is used for signing operations
  },
  (error) => {
    // PIN wrong or cancelled
    if (error.includes("BadPaddingException")) {
      // Wrong PIN entered
    }
  }
);
```

---

## 3. Frontend Side (JavaScript Flow)

### Complete Authentication Flow:

```javascript
// ============================================
// STEP 1: Initialize E-IMZO
// ============================================

function initializeEimzo() {
  // Check if E-IMZO client is loaded
  if (!window.EIMZOClient) {
    throw new Error("E-IMZO client not loaded");
  }

  // Set API keys (from .env)
  window.EIMZOClient.API_KEYS = [
    'localhost',
    'API_KEY_1',
    '127.0.0.1',
    'API_KEY_2',
    // ... more keys
  ];

  // Check CAPIWS version
  window.EIMZOClient.checkVersion(
    (major, minor) => {
      const required = 3 * 100 + 37; // Version 3.37+
      const current = major * 100 + minor;
      
      if (current < required) {
        throw new Error("E-IMZO version too old");
      }
      
      installApiKeys();
    },
    (error) => {
      throw new Error("CAPIWS service not available");
    }
  );
}

// ============================================
// STEP 2: Install API Keys
// ============================================

function installApiKeys() {
  window.EIMZOClient.installApiKeys(
    () => {
      // API keys installed, now find tokens
      findTokensAndLoadKeys();
    },
    (error) => {
      throw new Error("Failed to install API keys");
    }
  );
}

// ============================================
// STEP 3: Find USB Tokens and Certificates
// ============================================

function findTokensAndLoadKeys() {
  // Find USB tokens first
  window.CAPIWS.findTokens(
    () => {
      // USB tokens found, now find PFX files
      window.CAPIWS.findPfxs(
        () => {
          // Both found, list all certificates
          listAllCertificates();
        },
        (error) => {
          // PFX search failed, but continue with tokens
          listAllCertificates();
        }
      );
    },
    (error) => {
      // No USB tokens, try PFX files only
      window.CAPIWS.findPfxs(
        () => listAllCertificates(),
        () => listAllCertificates()
      );
    }
  );
}

// ============================================
// STEP 4: List All Certificates
// ============================================

function listAllCertificates() {
  window.CAPIWS.list_all_user_keys(
    (items) => {
      // Process certificates
      const certificates = items.map((item, index) => {
        const now = new Date();
        const validTo = new Date(item.validTo);
        const expired = validTo < now;

        return {
          id: `itm-${item.serialNumber}-${index}`,
          label: expired 
            ? `${item.CN} (muddati tugagan)` 
            : item.CN,
          disabled: expired,
          type: item.type, // "ftjc" or "pfx"
          data: item
        };
      });

      // Display certificates to user
      displayCertificates(certificates);
    },
    (error) => {
      throw new Error("Failed to list certificates");
    }
  );
}

// ============================================
// STEP 5: User Selects Certificate
// ============================================

function handleCertificateSelection(certificate) {
  // Load the selected certificate
  window.CAPIWS.load_key(
    certificate.data,
    (keyId) => {
      // Certificate loaded, PIN entered
      // keyId is used for signing
      createSignature(keyId, "Authentication data");
    },
    (error) => {
      if (error.includes("BadPaddingException")) {
        alert("Noto'g'ri PIN kiritildi");
      } else {
        alert("Kalitni yuklab bo'lmadi");
      }
    }
  );
}

// ============================================
// STEP 6: Create PKCS#7 Signature
// ============================================

function createSignature(keyId, dataToSign) {
  window.CAPIWS.create_pkcs7(
    keyId,
    dataToSign,  // Data to sign (e.g., "Tasdiqlaymiz")
    null,         // Timestamper (optional)
    (pkcs7) => {
      // Signature created successfully
      // pkcs7 is base64-encoded PKCS#7 signature
      sendToBackend(pkcs7, certificate.data);
    },
    (error) => {
      if (error.includes("BadPaddingException")) {
        alert("Noto'g'ri PIN");
      } else {
        alert("Imzo yaratib bo'lmadi");
      }
    }
  );
}

// ============================================
// STEP 7: Send to Backend
// ============================================

async function sendToBackend(pkcs7, certificateData) {
  const payload = {
    pkcs7: pkcs7,  // Base64-encoded PKCS#7 signature
    // For USB tokens (ftjc), vo is NOT sent
    // For PFX files, vo (certificate data) is sent
    ...(certificateData.type === "pfx" ? { vo: certificateData } : {})
  };

  try {
    const response = await fetch('/api/authentications/login/eimzo/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload)
    });

    const result = await response.json();
    
    if (result.access) {
      // Authentication successful
      // Store JWT token
      localStorage.setItem('access_token', result.access);
      // Redirect to main page
      window.location.href = '/main';
    }
  } catch (error) {
    console.error('Authentication failed:', error);
    alert('Kirish muvaffaqiyatsiz');
  }
}
```

### Error Handling:

```javascript
// Common error scenarios:

// 1. CAPIWS service not running
if (!window.CAPIWS) {
  // User needs to install E-IMZO service
  alert("E-IMZO xizmati o'rnatilmagan");
}

// 2. No USB tokens found
if (certificates.length === 0) {
  alert("USB-token yoki sertifikat topilmadi");
}

// 3. Wrong PIN
if (error.includes("BadPaddingException")) {
  alert("Noto'g'ri PIN kiritildi");
}

// 4. Certificate expired
if (new Date(certificate.validTo) < new Date()) {
  alert("Sertifikat muddati tugagan");
}

// 5. Network error
catch (error) {
  if (error.message.includes("fetch")) {
    alert("Server bilan aloqa yo'q");
  }
}
```

---

## 4. Local Service / Plugin (CAPIWS)

### What Runs on User PC:

**E-IMZO Local Service** (CAPIWS - Cryptographic API WebSocket Service)

- **Type**: Native application (Windows service / macOS daemon)
- **Protocol**: WebSocket server on `ws://localhost:PORT` or HTTP on `http://localhost:PORT`
- **Default Port**: Usually `127.0.0.1` with dynamic port assignment
- **Installation**: Downloaded from E-IMZO website, installed separately

### Communication Protocol:

```javascript
// CAPIWS exposes methods via WebSocket:

window.CAPIWS = {
  // Version check
  apiversion: (success, fail) => {
    // Returns: { major: 3, minor: 37 }
  },

  // Install API keys (security)
  installApiKeys: (keys, success, fail) => {
    // keys: string[] - API keys for authentication
  },

  // Find USB tokens
  findTokens: (success, fail) => {
    // Scans for connected USB tokens
  },

  // Find PFX files
  findPfxs: (success, fail) => {
    // Scans disk for .pfx certificate files
  },

  // List all certificates
  list_all_user_keys: (success, fail) => {
    // Returns array of certificate objects
  },

  // Load certificate (shows PIN dialog)
  load_key: (keyItem, success, fail) => {
    // keyItem: certificate object
    // Returns: keyId (string) for signing operations
  },

  // Create PKCS#7 signature
  create_pkcs7: (keyId, data, timestamper, success, fail) => {
    // keyId: from load_key
    // data: string to sign
    // Returns: base64-encoded PKCS#7 signature
  }
};
```

### OS Support:

- **Windows**: Native service, uses Windows Smart Card API
- **macOS**: Native daemon, uses macOS Smart Card Services
- **Linux**: Native service, uses PC/SC (PC/SC-Lite)

### USB Token Access:

The local service uses OS-level APIs:
- **Windows**: `WinSCard.dll` (Smart Card API)
- **macOS**: `PCSC.framework`
- **Linux**: `libpcsclite.so`

These APIs communicate with USB tokens via:
- **CCID Protocol** (USB Class for Smart Cards)
- **HID Protocol** (for some token types)

---

## 5. Backend Verification

### Receiving Signed Data:

```python
# Django/Flask example

from cryptography import x509
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import padding
from cryptography.hazmat.backends import default_backend
import base64

@api_view(['POST'])
def eimzo_login(request):
    data = request.data
    pkcs7_signature = data.get('pkcs7')  # Base64-encoded
    vo = data.get('vo')  # Only for PFX, not for USB tokens
    
    try:
        # Decode PKCS#7 signature
        signature_bytes = base64.b64decode(pkcs7_signature)
        
        # Parse PKCS#7 structure
        from cryptography.hazmat.primitives.serialization import pkcs7
        from cryptography import x509
        
        # Load certificate from signature
        cert_data = pkcs7.load_der_pkcs7_certificates(signature_bytes)
        signer_cert = cert_data[0]  # First certificate is signer
        
        # Extract certificate information
        subject = signer_cert.subject
        cn = subject.get_attributes_for_oid(x509.NameOID.COMMON_NAME)[0].value
        tin = subject.get_attributes_for_oid(x509.NameOID.ORGANIZATION_NAME)[0].value
        
        # Verify signature
        public_key = signer_cert.public_key()
        
        # Extract signed data and signature from PKCS#7
        # (Implementation depends on PKCS#7 library)
        signed_data = extract_signed_data(pkcs7_signature)
        signature = extract_signature(pkcs7_signature)
        
        # Verify
        public_key.verify(
            signature,
            signed_data.encode('utf-8'),
            padding.PKCS1v15(),
            hashes.SHA256()
        )
        
        # Find user by TIN or CN
        user = User.objects.get(tin=tin)
        
        # Generate JWT token
        access_token = generate_jwt_token(user)
        
        return Response({
            'access': access_token,
            'refresh': generate_refresh_token(user),
            'user_id': user.id,
            'role': user.role
        })
        
    except Exception as e:
        return Response(
            {'error': 'Signature verification failed'},
            status=400
        )
```

### PKCS#7 Structure:

```
PKCS#7 Signature contains:
├── Signed Data
│   ├── Content (original data)
│   ├── Digest Algorithm (SHA-256)
│   └── Signer Info
│       ├── Certificate (X.509)
│       ├── Signature Algorithm (RSA-PSS or RSA-PKCS1)
│       └── Signature (encrypted hash)
└── Certificates (certificate chain)
```

### Verification Steps:

1. **Parse PKCS#7**: Extract certificate and signature
2. **Extract Certificate**: Get signer's X.509 certificate
3. **Extract Public Key**: From certificate
4. **Verify Signature**: Using public key
5. **Check Certificate Validity**: Not expired, not revoked
6. **Identify User**: Match TIN/CN to database
7. **Issue JWT**: Return access token

---

## 6. Security Notes

### Why Browser Cannot Access USB Directly:

1. **Security Model**: Browsers run in sandbox, cannot access hardware
2. **Cross-Origin**: USB tokens are local resources, browsers block direct access
3. **Permissions**: OS requires elevated permissions for USB access
4. **Standardization**: No standard Web API for USB smart cards

### How E-IMZO Avoids Security Risks:

1. **Local Service**: Native app with proper OS permissions
2. **API Keys**: Authentication between browser and local service
3. **PIN Protection**: Private key never leaves USB token
4. **PKCS#7 Standard**: Industry-standard signature format
5. **Certificate Validation**: Backend verifies certificate chain
6. **HTTPS Only**: All communication encrypted

### Security Flow:

```
Browser (untrusted) 
  → WebSocket (localhost only)
    → Local Service (trusted, native)
      → USB Token (hardware security)
        → Private Key (never exposed)
          → PKCS#7 Signature (cryptographically secure)
            → Backend (verifies signature)
```

**Key Security Points:**
- Private key **never** leaves USB token
- PIN is entered in native dialog (not in browser)
- Local service validates API keys
- Backend verifies signature cryptographically

---

## 7. Modern Alternative Implementation

### Architecture:

```
┌─────────────────┐
│  React/Next.js   │
│   Frontend       │
└────────┬────────┘
         │
         │ WebSocket (ws://localhost:3495)
         │
┌────────▼────────────────────────────┐
│  Node.js Local Signer Service        │
│  (Electron / Tauri / Native)         │
│                                       │
│  - WebSocket server                   │
│  - USB token access (node-pcsclite)   │
│  - PKCS#7 signing (node-forge)       │
└────────┬────────────────────────────┘
         │
         │ USB HID/CCID
         │
┌────────▼────────┐
│   USB Token     │
└─────────────────┘
```

### Implementation:

#### 1. Frontend (React):

```typescript
// src/services/eimzoService.ts

class EIMZOService {
  private ws: WebSocket | null = null;
  private port = 3495;

  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(`ws://localhost:${this.port}`);
      
      this.ws.onopen = () => resolve();
      this.ws.onerror = (error) => reject(error);
    });
  }

  async listCertificates(): Promise<Certificate[]> {
    return this.sendRequest('list_certificates');
  }

  async signData(certificateId: string, data: string): Promise<string> {
    return this.sendRequest('sign', {
      certificateId,
      data
    });
  }

  private sendRequest(method: string, params?: any): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
        reject(new Error('WebSocket not connected'));
        return;
      }

      const requestId = Math.random().toString(36);
      
      const handler = (event: MessageEvent) => {
        const response = JSON.parse(event.data);
        if (response.id === requestId) {
          this.ws!.removeEventListener('message', handler);
          if (response.error) {
            reject(new Error(response.error));
          } else {
            resolve(response.result);
          }
        }
      };

      this.ws.addEventListener('message', handler);
      
      this.ws.send(JSON.stringify({
        id: requestId,
        method,
        params
      }));

      // Timeout after 30 seconds
      setTimeout(() => {
        this.ws!.removeEventListener('message', handler);
        reject(new Error('Request timeout'));
      }, 30000);
    });
  }
}
```

#### 2. Local Signer Service (Node.js):

```typescript
// local-signer-service/index.ts

import WebSocket from 'ws';
import pcsclite from '@pokusew/pcsclite';
import forge from 'node-forge';
import { exec } from 'child_process';

const wss = new WebSocket.Server({ port: 3495 });

interface Certificate {
  id: string;
  cn: string;
  tin: string;
  validTo: Date;
  type: 'usb' | 'pfx';
}

wss.on('connection', (ws) => {
  console.log('Client connected');

  ws.on('message', async (message) => {
    const request = JSON.parse(message.toString());
    
    try {
      let result;
      
      switch (request.method) {
        case 'list_certificates':
          result = await listCertificates();
          break;
          
        case 'sign':
          result = await signData(
            request.params.certificateId,
            request.params.data
          );
          break;
          
        default:
          throw new Error(`Unknown method: ${request.method}`);
      }
      
      ws.send(JSON.stringify({
        id: request.id,
        result
      }));
    } catch (error: any) {
      ws.send(JSON.stringify({
        id: request.id,
        error: error.message
      }));
    }
  });
});

async function listCertificates(): Promise<Certificate[]> {
  const certificates: Certificate[] = [];
  
  // Find USB tokens using PC/SC
  const pcsc = pcsclite();
  
  return new Promise((resolve, reject) => {
    pcsc.on('reader', (reader) => {
      reader.on('status', async (status) => {
        if (status.state & 0x20) { // Card present
          try {
            // Connect to card
            await reader.connect();
            
            // Read certificate (implementation depends on card type)
            const cert = await readCertificateFromCard(reader);
            
            certificates.push({
              id: cert.serialNumber,
              cn: cert.subject.CN,
              tin: cert.subject.TIN,
              validTo: cert.validity.notAfter,
              type: 'usb'
            });
          } catch (error) {
            console.error('Error reading card:', error);
          }
        }
      });
    });
    
    // Also find PFX files
    findPFXFiles().then((pfxCerts) => {
      certificates.push(...pfxCerts);
      resolve(certificates);
    });
  });
}

async function signData(
  certificateId: string,
  data: string
): Promise<string> {
  // Load certificate
  const certificate = await loadCertificate(certificateId);
  
  // Request PIN (show native dialog)
  const pin = await requestPIN(certificateId);
  
  // Create PKCS#7 signature
  const p7 = forge.pkcs7.createSignedData();
  p7.content = forge.util.createBuffer(data, 'utf8');
  
  // Add signer
  p7.addSigner({
    key: await getPrivateKey(certificateId, pin),
    certificate: certificate,
    digestAlgorithm: forge.pki.oids.sha256,
    authenticatedAttributes: [{
      type: forge.pki.oids.contentType,
      value: forge.pki.oids.data
    }, {
      type: forge.pki.oids.messageDigest
    }]
  });
  
  p7.sign();
  
  // Convert to DER and base64
  const der = forge.asn1.toDer(p7.toAsn1()).getBytes();
  return forge.util.encode64(der);
}

function requestPIN(certificateId: string): Promise<string> {
  // Show native PIN dialog
  // On Windows: use node-ffi to call Windows API
  // On macOS: use native dialog
  // On Linux: use zenity/kdialog
  
  return new Promise((resolve, reject) => {
    // Implementation depends on platform
    // Example using electron's dialog:
    // dialog.showMessageBox({ type: 'input', ... })
  });
}
```

#### 3. Backend (Node.js/Express):

```typescript
// backend/routes/auth.ts

import express from 'express';
import { verifyPKCS7 } from '../utils/crypto';

router.post('/login/eimzo', async (req, res) => {
  const { pkcs7 } = req.body;
  
  try {
    // Verify PKCS#7 signature
    const certificate = await verifyPKCS7(pkcs7);
    
    // Extract user info
    const tin = certificate.subject.get('TIN');
    const cn = certificate.subject.get('CN');
    
    // Find user
    const user = await User.findOne({ tin });
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Generate JWT
    const accessToken = generateJWT(user);
    
    res.json({
      access: accessToken,
      refresh: generateRefreshToken(user),
      user_id: user.id,
      role: user.role
    });
  } catch (error) {
    res.status(400).json({ error: 'Invalid signature' });
  }
});
```

### Key Differences from E-IMZO:

1. **WebSocket Instead of CAPIWS**: Custom protocol
2. **Node.js Local Service**: Cross-platform, easier to maintain
3. **Modern Crypto Libraries**: `node-forge`, `@pokusew/pcsclite`
4. **TypeScript**: Type safety
5. **Electron/Tauri**: Can bundle as desktop app

### Deployment:

1. **Local Service**: Install as system service/daemon
2. **Auto-start**: Configure to start on boot
3. **Port Management**: Use fixed port or discovery protocol
4. **Updates**: Auto-update mechanism

---

## Summary

E-IMZO USB token authentication uses a **three-layer architecture**:

1. **Browser** (JavaScript) → Communicates via WebSocket
2. **Local Service** (CAPIWS) → Handles USB token access
3. **USB Token** (Hardware) → Stores certificate and private key

**Security**: Private key never leaves the token, PIN entered in native dialog, backend verifies signature cryptographically.

**Modern Alternative**: Can be rebuilt using Node.js local service, WebSocket communication, and modern crypto libraries while maintaining the same security model.
