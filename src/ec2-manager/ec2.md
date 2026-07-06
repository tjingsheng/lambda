# Sample EC2 — install steps

1. Configure swap (EC2)

```
sudo fallocate -l 4G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
free -h
```

2. Base dependencies (EC2)

```
sudo timedatectl set-timezone Asia/Singapore
sudo apt update && sudo apt upgrade -y
sudo apt install -y \
   unzip \
   git \
   tmux \
   build-essential \
   unattended-upgrades
sudo dpkg-reconfigure -plow unattended-upgrades
```

3. Node via nvm (EC2)

```
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash
\. "$HOME/.nvm/nvm.sh"
nvm install 24
nvm alias default 24
corepack enable
```

4. Docker (EC2)

```
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker ubuntu
newgrp docker
docker run hello-world
```

5. Claude Code (EC2)

```
curl -fsSL https://claude.ai/install.sh | bash
claude --version
cd ~/v-fork
claude
```

- Sign in with Claude Pro/Max (not an API key) with `/login`.
- Accept the workspace trust prompt.

6. Claude Remote Control on boot (EC2)

```
sudo tee /etc/systemd/system/claude-remote.service > /dev/null <<'EOF'
[Unit]
Description=Claude Code Remote Control
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=ubuntu
Environment=HOME=/home/ubuntu
WorkingDirectory=/home/ubuntu/v-fork
ExecStart=/home/ubuntu/.local/bin/claude remote-control --name ec2-main
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF
sudo systemctl daemon-reload
sudo systemctl enable --now claude-remote.service
```

- Phone: Claude app → **Code** tab → tap `ec2-main` (green dot = online). No SSH, outbound HTTPS only.
- Requires step 5 done once first (Pro/Max login + workspace trust) and Claude Code v2.1.51+.
- Set `WorkingDirectory` to your project folder — must match a directory where you've run `claude` and accepted the trust prompt, or the service exits with "Workspace not trusted".
- Optional (v2.1.200+): `remote-control -c` resumes the previous conversation after a stop/start.

7. Managing the service (EC2)

```
systemctl status claude-remote             # is it running?
journalctl -u claude-remote -n 50          # last 50 log lines
journalctl -u claude-remote -f             # follow logs live (Ctrl-C to exit)
sudo systemctl restart claude-remote       # restart manually
sudo systemctl stop claude-remote          # stop until next boot
sudo systemctl disable --now claude-remote # stop and remove from boot
```

- `Active: active (running)` = healthy; `activating (auto-restart)` = crash-looping, check the logs.
- After editing the unit file: `sudo systemctl daemon-reload && sudo systemctl restart claude-remote`.
