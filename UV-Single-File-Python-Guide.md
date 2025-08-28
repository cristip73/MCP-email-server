# UV Single File Python Implementation Guide

## Overview

UV is an extremely fast Python package and project manager written in Rust by Astral (creators of Ruff). It provides comprehensive single-file Python script support through PEP 723 inline script metadata, allowing for self-contained scripts with automatic dependency management.

## Key Features

- **10-100x faster than pip** - Written in Rust for exceptional performance
- **PEP 723 Support** - Standard format for inline script metadata
- **Automatic Environment Management** - Creates isolated virtual environments automatically
- **Python Version Selection** - Manages Python versions and requirements
- **Dependency Locking** - Reproducible environments with lockfiles
- **Cross-platform Support** - Works on macOS, Linux, and Windows

## Installation

### Official Installer (Recommended)

**macOS/Linux:**
```bash
curl -LsSf https://astral.sh/uv/install.sh | sh
```

**Windows (PowerShell):**
```powershell
powershell -ExecutionPolicy ByPass -c "irm https://astral.sh/uv/install.ps1 | iex"
```

### Alternative Methods
- `pip install uv`
- `brew install uv` (macOS)

## Single File Script Format

### Basic PEP 723 Inline Metadata

UV supports Python's PEP 723 standard for inline script metadata:

```python
# /// script
# dependencies = ["requests<3", "rich"]
# requires-python = ">=3.12"
# ///

import requests
from rich.console import Console

console = Console()
console.print("Hello, World!", style="bold blue")

response = requests.get("https://api.github.com/repos/astral-sh/uv")
console.print(f"UV has {response.json()['stargazers_count']} stars!")
```

### Advanced Metadata Options

```python
# /// script
# dependencies = [
#     "requests<3",
#     "rich",
#     "typer>=0.9.0"
# ]
# requires-python = ">=3.11"
# [tool.uv]
# exclude-newer = "2024-03-25T00:00:00Z"
# [tool.uv.sources]
# httpx = { git = "https://github.com/encode/httpx" }
# ///

import requests
import typer
from rich.console import Console
```

## Script Execution

### Basic Execution
```bash
# Run a script with inline dependencies
uv run example.py

# Run with additional dependencies
uv run --with rich example.py

# Specify Python version
uv run --python 3.10 example.py
```

### Executable Scripts

Create executable scripts using a shebang:

```python
#!/usr/bin/env -S uv run --script
# /// script
# dependencies = ["cowsay"]
# ///

import cowsay
cowsay.cow("Hello from UV!")
```

Make it executable:
```bash
chmod +x script.py
./script.py
```

## Dependency Management

### Adding Dependencies
```bash
# Add dependencies to an existing script
uv add --script example.py 'requests<3' 'rich'
```

### Locking Dependencies

Generate a lockfile for reproducible environments:
```bash
# Create a lockfile adjacent to the script
uv lock --script example.py
```

This creates `example.py.lock` with exact dependency versions.

## Advanced Features

### Alternative Package Indexes

Support for custom package indexes:

```python
# /// script
# dependencies = ["my-private-package"]
# [tool.uv.sources]
# my-private-package = { index = "https://my-private-index.com/simple" }
# ///
```

### Environment Variables

Control UV behavior with environment variables:
- `UV_PYTHON` - Specify Python executable
- `UV_CACHE_DIR` - Set cache directory
- `UV_INDEX_URL` - Set default package index

### GUI Scripts (Windows)

UV properly handles GUI scripts on Windows, avoiding console windows for GUI applications.

## Best Practices

### 1. Version Pinning
```python
# /// script
# dependencies = [
#     "requests>=2.28,<3.0",
#     "rich>=13.0"
# ]
# requires-python = ">=3.10"
# ///
```

### 2. Reproducible Builds
```python
# /// script
# dependencies = ["pandas", "matplotlib"]
# requires-python = ">=3.11"
# [tool.uv]
# exclude-newer = "2024-03-01T00:00:00Z"
# ///
```

### 3. Script Organization
- Keep dependencies minimal and specific
- Use clear version constraints
- Include Python version requirements
- Consider using lockfiles for production scripts

### 4. Performance Optimization
- UV caches dependencies globally for faster subsequent runs
- Use virtual environments to avoid conflicts
- Leverage UV's parallel installation capabilities

## Comparison with Traditional Approaches

| Feature | Traditional pip/venv | UV Single File |
|---------|---------------------|----------------|
| Setup Time | Manual venv creation | Automatic |
| Dependency Declaration | requirements.txt | Inline metadata |
| Environment Isolation | Manual | Automatic |
| Performance | Slow | 10-100x faster |
| Python Version Management | Manual pyenv | Built-in |
| Reproducibility | Complex | Simple lockfiles |

## Common Use Cases

### 1. Standalone Utilities
```python
#!/usr/bin/env -S uv run --script
# /// script
# dependencies = ["click", "colorama"]
# requires-python = ">=3.10"
# ///

import click
from colorama import Fore, Style

@click.command()
@click.option('--name', default='World')
def hello(name):
    click.echo(f'{Fore.GREEN}Hello {name}!{Style.RESET_ALL}')

if __name__ == '__main__':
    hello()
```

### 2. Data Analysis Scripts
```python
# /// script
# dependencies = [
#     "pandas>=2.0",
#     "matplotlib>=3.5",
#     "seaborn>=0.12"
# ]
# requires-python = ">=3.11"
# ///

import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns

# Your data analysis code here
```

### 3. API Clients
```python
# /// script
# dependencies = [
#     "httpx>=0.24",
#     "pydantic>=2.0"
# ]
# requires-python = ">=3.11"
# ///

import httpx
from pydantic import BaseModel

class APIResponse(BaseModel):
    status: str
    data: dict

# API client implementation
```

## Troubleshooting

### Common Issues

1. **Script not found**: Ensure the script path is correct
2. **Python version conflicts**: Check `requires-python` specification
3. **Dependency resolution**: Use `uv lock --script` for complex dependencies
4. **Permission errors**: Use `chmod +x` for executable scripts

### Debugging Commands

```bash
# Check UV version
uv --version

# Verbose execution
uv run --verbose example.py

# Show dependency resolution
uv lock --script example.py --verbose
```

## Conclusion

UV's single-file Python implementation represents a significant advancement in Python scripting. By combining PEP 723 inline metadata with UV's performance and automatic environment management, it enables truly portable, self-contained Python scripts that are easy to distribute and execute.

The key benefits include:
- **Zero setup overhead** - Scripts run immediately without manual environment setup
- **Exceptional performance** - 10-100x faster than traditional pip
- **Built-in reproducibility** - Lockfiles ensure consistent environments
- **Modern standards** - Based on PEP 723 for future compatibility
- **Cross-platform support** - Works seamlessly across operating systems

This approach is ideal for standalone utilities, data analysis scripts, automation tools, and any scenario where you need portable Python scripts with reliable dependency management.