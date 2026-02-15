# Port Info

Get detailed information about ports including process info, connections, and network details.

## Installation

```bash
cd port-info
npm install
```

## Usage

### Get port info

```bash
npm start info 3000
```

### Quick lookup

```bash
npm start whatis 8080
```

### Process details

```bash
npm start process 3000
```

### Service lookup

```bash
npm start service 5432
```

### All listening ports

```bash
npm start all
```

## Commands

| Command | Description |
|---------|-------------|
| `info <port>` | Get detailed info about a port |
| `whatis <port>` | Quick lookup what's using the port |
| `process <port>` | Detailed process information |
| `service <port>` | Lookup common port services |
| `all` | List all listening ports |

## Options

- `-j, --json` - Output as JSON
