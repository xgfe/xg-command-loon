# xg loon
xg loon pulgin

## Usage
```shell
cd $project_dir
xg loon
# or
xg loon
```

### Config
> env -> remote -> file

- Environment Config
```shell
XG_LOON="config" xg loon [--config-env="XG_LOON"]
```
- Remove Config
```shell
XG_LOON_REMOTE="url" xg loon [--config-remote="XG_LOON_REMOTE"]
```
- Local File Config
```shell
xg loon --config-file=".xg.loon.config"
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
xg loon -h
```
