# Pi Profile System

A Hermes-style profile system for the pi coding agent that lets you run multiple isolated configurations.

## Quick Start

### List Profiles
```bash
pi-profile list
```

### Create a Profile
```bash
pi-profile create work
pi-profile create personal
```

### Switch Profiles
```bash
pi-profile use work       # Switch to work profile
pi-profile use personal   # Switch to personal profile
pi-profile use default    # Use default profile
```

## Profile Structure

Each profile has its own isolated directory:

```
~/.pi/
├── agent/                  # Default profile
│   ├── auth.json           # API keys
│   ├── settings.json       # Settings
│   └── sessions/           # Conversation history
├── profiles/
│   ├── work/              # Work profile
│   │   ├── auth.json       # Work API keys
│   │   ├── settings.json   # Work settings
│   │   └── sessions/       # Work conversations
│   └── personal/          # Personal profile
│       └── ...
└── current-profile         # Active profile name
```

## Use Cases

### Multiple API Keys
```bash
pi-profile create work
pi-profile use work
# Login with work credentials
# Switch to personal for personal projects
```

### Client Isolation
```bash
pi-profile create client-acme
pi-profile create client-globex
pi-profile use client-acme  # All work here is for ACME
```

### Skill Experiments
```bash
pi-profile create testing
pi-profile use testing
# Install experimental skills without affecting main setup
```

## Commands

| Command | Description |
|---------|-------------|
| `pi-profile list` | List all profiles |
| `pi-profile create <name>` | Create new profile |
| `pi-profile use <name>` | Switch to profile |
| `pi-profile show [name]` | Show profile details |
| `pi-profile delete <name>` | Delete a profile |
| `pi-profile rename <old> <new>` | Rename a profile |
| `pi-profile copy <from> <to>` | Copy a profile |
| `pi-profile export [name]` | Export to tar.gz |
| `pi-profile import <file> [name]` | Import from archive |

## Shell Integration

Add to your `~/.bashrc` or `~/.zshrc`:

```bash
# Unix/macOS/Git Bash
source ~/.pi/bin/pi-profile-completion.bash
```

Or for PowerShell, add to your profile:

```powershell
Invoke-Expression (Get-Content "$HOME\.pi\bin\pi-profile-completion.ps1" -Raw)
```

## Environment Variables

```bash
PI_PROFILE=work pi              # Run single command with profile
PI_CODING_AGENT_DIR=~/.pi/profiles/work pi  # Override config directory
```

## Files Created

- `~/.pi/profiles/` - Profile directories
- `~/.pi/current-profile` - Active profile marker
- `~/.pi/bin/pi-profile` - CLI script (Unix)
- `~/.pi/bin/pi-profile.bat` - CLI script (Windows)
