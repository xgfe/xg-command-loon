# xg-command-loon
xg-command-loon pulgin

## Usage
```shell
cd $project_dir
xg loon
# or
xg-command-loon
```

### Config
> env -> remote -> file

- Environment Config
```shell
XG_LOON="config" xg-command-loon [--config-env="XG_LOON"]
```
- Remove Config
```shell
XG_LOON_REMOTE="url" xg-command-loon [--config-remote="XG_LOON_REMOTE"]
```
- Local File Config
```shell
xg-command-loon --config-file=".xg.loon.config"
```

### Hooks
default hook

#### Custom Hook
```json
{
  "config": {
    "loon": {
      "scripts": {
        "preinstall": "./loon-preinstall-hooks.js",
        "postinstall": false
      }
    }
  }
}
```

## Development
```shell
xg-command-loon -h
```
