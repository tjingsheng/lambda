# Sample EC2 — install steps

A box whose only job is running Claude Code via remote control. Everything below survives a reboot.

1. Configure swap (EC2)

```
sudo fallocate -l 4G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
free -h
```

- Skip if the instance has ≥8 GB RAM. The `/etc/fstab` line is what brings swap back on boot.

2. Base packages (EC2)

```
sudo timedatectl set-timezone Asia/Singapore
sudo apt update && sudo apt upgrade -y
sudo apt install -y git curl unattended-upgrades
cat /etc/apt/apt.conf.d/20auto-upgrades   # both lines should be "1"
```

- No Node/Docker — the Claude Code installer ships a native binary.
- Timezone first, so `journalctl` reads in SGT. `unattended-upgrades` because the box is internet-facing, unattended, and holds credentials.
- Installing enables it silently (the debconf prompt is low-priority, below the default threshold). If either line is `"0"` or the file is missing, `sudo dpkg-reconfigure -plow unattended-upgrades` gives you the prompt to turn it on.

3. Clone the repository with a scoped PAT (EC2)

Create a **fine-grained** GitHub token limited to `<TARGET_REPOSITORY>` — *Only select repositories*, *Contents: Read and write*.

```
umask 077
cat > ~/pat.txt      # paste the token, Enter, then Ctrl-D
chmod 600 ~/pat.txt

git config --global credential.helper \
  '!f() { echo username=x-access-token; echo "password=$(cat ~/pat.txt)"; }; f'
git clone https://github.com/<OWNER>/<TARGET_REPOSITORY>.git ~/<TARGET_REPOSITORY>
```

- Token stays in `~/pat.txt` only — not in `.git/config` or shell history. Rotate by overwriting the file.
- Expired token = 403 on `git fetch`.

4. Claude Code (EC2)

```
curl -fsSL https://claude.ai/install.sh | bash
claude --version
cd ~/<TARGET_REPOSITORY>
claude
```

- Sign in with Claude Pro/Max (not an API key) with `/login`, then accept the workspace trust prompt.
- Stored in `~/.claude` — one time only, no need to repeat after a restart.
- Send one message before quitting. Logging in alone writes no session file, and step 5's `-c` needs one to resume.

5. Claude Remote Control on boot (EC2)

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
WorkingDirectory=/home/ubuntu/<TARGET_REPOSITORY>
ExecStart=/bin/sh -c '/home/ubuntu/.local/bin/claude remote-control --name ec2-claude -c || exec /home/ubuntu/.local/bin/claude remote-control --name ec2-claude'
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF
sudo systemctl daemon-reload
sudo systemctl enable --now claude-remote.service
```

- Phone: Claude app → **Code** tab → tap `ec2-claude` (green dot = online). No SSH, outbound HTTPS only.
- Requires step 4 done once first, and Claude Code v2.1.51+ (`-c` resumes the last conversation, v2.1.200+).
- `WorkingDirectory` must be a directory where you've accepted the trust prompt, or the service exits with "Workspace not trusted".
- The `||` fallback matters: bare `-c` exits 1 with `No recent session found in this directory or its worktrees` when there is nothing recent to resume, and `Restart=always` turns that into a silent crash loop — the device flickers online for a second every 10s and never holds a session. The fallback starts a fresh session instead.

6. Managing the service (EC2)

```
systemctl status claude-remote --no-pager    # is it running?
journalctl -u claude-remote -n 50 --no-pager # last 50 log lines
journalctl -u claude-remote -f               # follow logs live (Ctrl-C to exit)
journalctl -u claude-remote -b --no-pager    # logs since this boot only
sudo systemctl restart claude-remote         # restart manually
sudo systemctl stop claude-remote            # stop until next boot
sudo systemctl disable --now claude-remote   # stop and remove from boot
```

- `Active: active (running)` = healthy; `activating (auto-restart)` = crash-looping, check the logs.
- After editing the unit file: `sudo systemctl daemon-reload && sudo systemctl restart claude-remote`.
- `journalctl --utc` when correlating with AWS console events.
