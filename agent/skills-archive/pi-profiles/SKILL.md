---
name: pi-profiles
description: Create and manage isolated pi coding agent profiles with separate auth, settings, sessions, skills, and extensions. Use when the user wants multiple independent pi configurations (e.g., work vs personal, different API keys, different skill sets).
---

# Pi Profiles

Create isolated working environments for pi coding agent, each with their own configuration, sessions, skills, and API credentials.

## When to Use Profiles

- **Multiple identities**: Work vs personal projects with different API keys
- **Client isolation**: Separate credentials and settings per client
- **Skill testing**: Experiment with different skill configurations
- **Team environments**: Different setups for different team members
- **Clean slate**: Start fresh without losing existing configuration

## Quick Start

```bash
# List all profiles
/profile list

# Create a new profile
/profile create work

# Activate a profile
/profile use work

# Show current profile details
/profile show

# Switch back to default
/profile use default
```

## Profile Structure

Each profile is a complete isolated environment:

```
~/.pi/
├── agent/                      # Default profile (always exists)
│   ├── auth.json               # API keys & auth tokens
│   ├── settings.json           # User preferences
│   ├── models.json             # Custom model configurations
│   ├── sessions/               # Conversation history
│   ├── skills/                 # Installed skills
│   ├── prompts/                # Prompt templates
│   ├── themes/                 # Custom themes
│   └── extensions/             # Extensions
│
├── profiles/
│   ├── work/                   # Work profile
│   │   ├── auth.json           # Work API keys
│   │   ├── settings.json       # Work preferences
│   │   ├── sessions/
│   │   └── ...
│   │
│   └── personal/               # Personal projects
│       ├── auth.json           # Personal API keys
│       └── ...
│
└── current-profile             # Contains active profile name
```

## Commands

### Management

| Command | Description |
|---------|-------------|
| `/profile list` | List all profiles and show active one |
| `/profile create <name>` | Create a new empty profile |
| `/profile use <name>` | Switch to a profile (sticky default) |
| `/profile show [name]` | Show profile details and contents |
| `/profile delete <name>` | Delete a profile (must not be active) |
| `/profile rename <old> <new>` | Rename a profile |
| `/profile copy <from> <to>` | Duplicate a profile |

### Import/Export

| Command | Description |
|---------|-------------|
| `/profile export [name]` | Export profile to tar.gz archive |
| `/profile import <file> [name]` | Import from archive |

### Quick Access

| Command | Description |
|---------|-------------|
| `/profile shell <name>` | Show profile environment variables |
| `/profile edit [name]` | Open profile folder in file explorer |
| `/profile help` | Show all commands and help |

## CLI Alternative

The standalone `pi-profile` script provides the same functionality:

```bash
# Add to PATH (Unix/macOS)
export PATH="$HOME/.pi/bin:$PATH"

# Windows: Ensure .pi/bin is in your PATH

# Commands (same as /profile but from shell)
pi-profile list
pi-profile create work
pi-profile use work
pi-profile export work ~/work-backup.tar.gz
```

## Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `PI_PROFILE` | Override active profile (per-session) | `PI_PROFILE=work pi` |
| `PI_CODING_AGENT_DIR` | Full config directory override | `PI_CODING_AGENT_DIR=~/.pi/profiles/client-a` |

### Using with Shell

```bash
# Run single command with different profile
PI_PROFILE=work pi -p "What sessions do I have?"

# Start new shell with profile active
pi-profile shell work
# Now all 'pi' commands use the 'work' profile
exit  # Return to normal shell
```

## Wrapper Scripts

Create standalone wrapper scripts for quick profile access:

```bash
# Create wrappers for common profiles
pi-profile wrapper work
pi-profile wrapper personal

# Now you can run:
pi-work                    # Uses 'work' profile
pi-personal               # Uses 'personal' profile
pi                        # Uses default (or last used)
```

Windows creates `.cmd` files in `AppData\Local\Microsoft\WindowsApps`.

## Use Cases

### Multiple API Keys

```bash
# Create profiles with different API keys
/profile create work
/profile use work
# Then authenticate in the work profile

/profile create personal
/profile use personal  
# Authenticate with different credentials
```

### Client Isolation

```bash
/profile create client-acme
/profile use client-acme
# Configure for client-specific settings

/profile create client-globex
/profile use client-globex
# Separate environment for another client
```

### Skill Experimentation

```bash
/profile create testing
/profile use testing
# Install experimental skills
# If you break something, just delete and recreate
/profile delete testing
```

## Sharing Profiles

```bash
# Export
/profile export work
# Creates ~/.pi/work.tar.gz

# Share the file, then import on another machine
/profile import ~/Downloads/work.tar.gz
/profile use work
```

## Troubleshooting

### Profile Not Found

```
Error: Profile 'name' does not exist
```

Run `/profile create <name>` first, or check for typos.

### Cannot Delete Active Profile

```
Warning: This is the currently active profile!
```

Run `/profile use default` first to switch away.

### API Keys Not Working

Verify you're using the correct profile:
```bash
/profile show
# Look for auth.json entry
```

### Sessions Mixed Up

Each profile has its own session history. Check you're in the right profile:
```bash
/profile list
# Active profile marked with ●
```

## Files Created

| File | Purpose |
|------|---------|
| `~/.pi/current-profile` | Contains active profile name |
| `~/.pi/profiles/` | Directory for all non-default profiles |
| `~/.pi/bin/pi-profile` | Standalone CLI script (Unix) |
| `~/.pi/bin/pi-profile.bat` | Standalone CLI script (Windows) |

## Best Practices

1. **Name clearly**: Use descriptive names like `work`, `personal`, `client-name`
2. **Export backups**: Before major changes, export your profile
3. **Test first**: Create a `test` profile for experiments
4. **Keep defaults clean**: Keep default profile for reliable base config
