# RemakePDF - VPS Deployment Guide

## Prerequisites

1. **Python 3.10+** installed on your VPS
2. **Tesseract OCR** for OCR functionality:
   ```bash
   # Ubuntu/Debian
   sudo apt-get update
   sudo apt-get install -y tesseract-ocr tesseract-ocr-eng poppler-utils
   
   # CentOS/RHEL
   sudo yum install -y tesseract poppler-utils
   ```

3. **Poppler** for PDF to image conversion (included above)

## Installation

1. **Clone/Upload the project to your VPS:**
   ```bash
   cd /var/www/
   git clone <your-repo-url> remakepdf
   cd remakepdf
   ```

2. **Create virtual environment:**
   ```bash
   python3 -m venv venv
   source venv/bin/activate
   ```

3. **Install dependencies:**
   ```bash
   pip install --upgrade pip
   pip install -r requirements.txt
   ```

4. **Create required directories:**
   ```bash
   mkdir -p uploads processed
   chmod 755 uploads processed
   ```

5. **Set environment variables:**
   ```bash
   export SESSION_SECRET="your-secure-random-secret-key"
   ```

## Running the Application

### Development (testing)
```bash
python app.py
```

### Production with Gunicorn
```bash
chmod +x run_production.sh
./run_production.sh
```

Or manually:
```bash
gunicorn --bind 0.0.0.0:5000 --workers 4 --timeout 120 wsgi:app
```

## Nginx Configuration (Recommended)

Create `/etc/nginx/sites-available/remakepdf`:

```nginx
server {
    listen 80;
    server_name your-domain.com;

    client_max_body_size 100M;

    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 120s;
        proxy_connect_timeout 120s;
    }

    location /static {
        alias /var/www/remakepdf/static;
        expires 30d;
    }
}
```

Enable the site:
```bash
sudo ln -s /etc/nginx/sites-available/remakepdf /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## Systemd Service (Auto-start)

Create `/etc/systemd/system/remakepdf.service`:

```ini
[Unit]
Description=RemakePDF Application
After=network.target

[Service]
User=www-data
Group=www-data
WorkingDirectory=/var/www/remakepdf
Environment="PATH=/var/www/remakepdf/venv/bin"
Environment="SESSION_SECRET=your-secure-secret-key"
ExecStart=/var/www/remakepdf/venv/bin/gunicorn --bind 127.0.0.1:5000 --workers 4 --timeout 120 wsgi:app
Restart=always

[Install]
WantedBy=multi-user.target
```

Enable and start:
```bash
sudo systemctl daemon-reload
sudo systemctl enable remakepdf
sudo systemctl start remakepdf
sudo systemctl status remakepdf
```

## Security Notes

1. **Set a strong SESSION_SECRET** in production
2. **Use HTTPS** with Let's Encrypt:
   ```bash
   sudo apt install certbot python3-certbot-nginx
   sudo certbot --nginx -d your-domain.com
   ```
3. **Configure firewall** to only allow ports 80, 443, and SSH
4. **Files are auto-deleted** after 30 minutes for privacy

## Troubleshooting

- **OCR not working**: Ensure tesseract-ocr is installed
- **PDF to image fails**: Ensure poppler-utils is installed
- **Permission errors**: Check uploads/processed folder permissions
- **Large file uploads fail**: Increase nginx client_max_body_size

## Project Structure

```
remakepdf/
├── app.py              # Main Flask application
├── wsgi.py             # WSGI entry point
├── requirements.txt    # Python dependencies
├── run_production.sh   # Production startup script
├── tools/              # PDF processing modules
├── templates/          # HTML templates
├── static/             # CSS, JS, images
├── uploads/            # Temporary uploads (auto-cleanup)
└── processed/          # Processed files (auto-cleanup)
```
