# Industrial Demo Setup: Cloudflare & Google Passkeys

This guide explains how to deploy the **Aayam Face-Recog** system for a professional presentation using a free Cloudflare tunnel and real Google Passkey biometrics.

---

## 1. Cloudflare Quick Tunnel (The Public Bridge)
Passkeys require a **public HTTPS domain** to function. Cloudflare provides a free service called "Quick Tunnels" that gives you a secure URL without needing to buy a domain.

### **Setup Steps:**
1. **Download `cloudflared`**:
   - Download the Windows binary from: [Cloudflare Downloads](https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe)
   - Rename it to `cloudflared.exe` and place it in your project root.

2. **Start the Tunnel**:
   - Open a terminal and run:
     ```powershell
     .\cloudflared.exe tunnel --url http://localhost:3000
     ```
3. **Capture your URL**:
   - Look for a line like: `https://your-unique-name.trycloudflare.com`. 
   - **Keep this terminal open!** If you close it, the link will stop working.

---

## 2. System Configuration
The backend must be told about your new Cloudflare domain to verify the biometric "handshake."

1. Open the `.env` file in the project root.
2. Update the following lines using your Cloudflare URL:
   ```env
   # Replace with your actual Cloudflare URL (NO https://)
   RP_ID=your-unique-name.trycloudflare.com
   
   # Replace with the full URL (WITH https://)
   ORIGIN=https://your-unique-name.trycloudflare.com
   ```
3. **Deploy the update**:
   - Run `Industrial-Start.ps1`. This rebuilds the `user-service` with the new security origin.

---

## 3. Google Passkey Workflow (Gmail Integration)
Our system uses the **FIDO2/WebAuthn** standard. This allows the employee's fingerprint to be securely managed by their **Google Account**.

### **How to Demo:**
1. **Link the Device**:
   - Open the Cloudflare URL on your phone.
   - Enter your Employee ID and click **Verify & Link**.
2. **Register the Passkey**:
   - Click **"Sync Fingerprint (Passkey)"**.
   - Your phone (Android/iOS) will show a native prompt: *"Create a passkey for Aayam Face-Recog?"*
   - **Important**: Choose to save it to your **Google Account (Gmail)**.
3. **The Gmail Benefit**:
   - The biometric key is now backed up to that Gmail account. 
   - Even if you switch phones, logging into that Gmail account allows you to "Recover" the passkey and continue punching in.

---

## 4. Mobile Hardware Punch-In
Once linked, the daily flow is pure industrial magic:

1. Employee opens the Cloudflare link on their phone.
2. Clicks **Punch In**.
3. The phone shows the native Android/iOS biometric selector.
4. User touches the **Fingerprint Sensor**.
5. The phone sends a cryptographic signature to the laptop.
6. The laptop verifies the signature and logs the attendance.

---

## 5. Troubleshooting (Demo Day Check)
- **403 Forbidden / Origin Mismatch**: Ensure `RP_ID` in `.env` matches the Cloudflare URL exactly (no extra slashes).
- **Passkey Selector doesn't appear**: Ensure you are on `https://`. Biometrics are physically disabled by browsers on `http://`.
- **Laptop Firewall**: If the tunnel starts but the phone says "Unreachable," run `Setup-Network.ps1` as Administrator to ensure port 3000 is open.

---
*Created for the Aayam Industrial Attendance Platform v2.5*
