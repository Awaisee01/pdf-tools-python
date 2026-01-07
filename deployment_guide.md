# Hostinger VPS Deployment Guide (Ubuntu 20.04/22.04)

## Prerequisites
- A Hostinger VPS (KVM) running Ubuntu 20.04 or 22.04.
- SSH access to your VPS (IP address, username `root`, password).
- A domain name pointing to your VPS IP address (A Record).

## 1. System Update & Dependencies
Connect to your VPS via SSH and run:
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install python3-pip python3-venv nginx git -y
```

## 2. Project Setup
Choose a directory for your app (e.g., `/var/www/pdf-forge`):
```bash
mkdir -p /var/www/pdf-forge
cd /var/www/pdf-forge
# Upload your project files here (using SFTP/FileZilla) or git clone
# Ensure 'app.py', 'requirements.txt', and 'gunicorn_config.py' are present
```

## 3. Python Environment
Create and activate a virtual environment:
```bash
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
pip install gunicorn
```

> [!IMPORTANT]
> **Poppler Dependency**: Most PDF tools require `poppler-utils`.
> ```bash
> sudo apt install poppler-utils -y
> ```
> **Tesseract OCR**: Required for OCR tool.
> ```bash
> sudo apt install tesseract-ocr -y
> ```

## 4. Gunicorn Service (Systemd)
Create a service file to keep your app running:
```bash
sudo nano /etc/systemd/system/pdfforge.service
```

Paste the following (adjust paths if different):
```ini
[Unit]
Description=Gunicorn instance to serve PDF-Forge
After=network.target

[Service]
User=root
Group=www-data
WorkingDirectory=/var/www/pdf-forge
Environment="PATH=/var/www/pdf-forge/venv/bin"
Environment="SESSION_SECRET=your-super-secret-key-here"
ExecStart=/var/www/pdf-forge/venv/bin/gunicorn -c gunicorn_config.py app:app

[Install]
WantedBy=multi-user.target
```

Start and enable the service:
```bash
sudo systemctl start pdfforge
sudo systemctl enable pdfforge
sudo systemctl status pdfforge
```

## 5. Nginx Configuration
Configure Nginx as a reverse proxy:
```bash
sudo nano /etc/nginx/sites-available/pdfforge
```

Paste the following (replace `yourdomain.com`):
```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        client_max_body_size 50M;  # Allow large PDF uploads
    }
}
```

Enable the site:
```bash
sudo ln -s /etc/nginx/sites-available/pdfforge /etc/nginx/sites-enabled
sudo nginx -t
sudo systemctl restart nginx
```

## 6. SSL Certificate (HTTPS)
Secure your site with Let's Encrypt:
```bash
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

## 7. Verification
- Visit `https://yourdomain.com`.
- Test uploading and processing a PDF.
