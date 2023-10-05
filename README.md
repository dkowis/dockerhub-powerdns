# dockerhub-powerdns
Docker images of PowerDNS software built on Alpine Linux
- https://hub.docker.com/r/tcely/dnsdist/
- https://hub.docker.com/r/tcely/powerdns-recursor/
- https://hub.docker.com/r/tcely/powerdns-server/

# How to use the javascript to do the right thing

Export a GITHUB_TOKEN that can read from the API

```shell
cd .github/actions
node get_latest_stable.mjs
```


# How to build it locally using buildx on non-arm hardware

In the folder for the product you want to build, do this:

```bash
docker buildx build --push \
  --build-arg MAKE_JOBS=20 \
  --platform linux/arm64/v8 \
  --tag registry/powerdns-server:buildx-local \
  .
```

## Better examples of building it locally:
```bash
cd dnsdist
docker buildx build \
  --builder multi-arch-builder \
  --build-arg DNSDIST_VERSION=1.8.0 \
  --build-arg MAKE_JOBS=32 \
  --push \
  --tag registry.light.kow.is/kowis/dnsdist:1.8.0 \
  --platform linux/arm64,linux/amd64 \
  .

cd authoritative
docker buildx build \
  --builder multi-arch-builder \
  --build-arg AUTH_VERSION=4.8.1 \
  --build-arg MAKE_JOBS=32 \
  --push \
  --tag registry.light.kow.is/kowis/powerdns-server:4.8.1 \
  --platform linux/arm64,linux/amd64 \
  .

```

## Examples of using these images

* ### As a base for your own `Dockerfile`
  ```dockerfile
    FROM tcely/dnsdist

    COPY dnsdist.conf /etc/dnsdist/dnsdist.conf
    EXPOSE 53/tcp 53/udp

    ENTRYPOINT ["/usr/local/bin/dnsdist", "--uid", "dnsdist", "--gid", "dnsdist"]
    CMD ["--supervised", "--disable-syslog"]
  ```
* ### In your `docker-compose.yml`
  ```yaml
    version: '3'
    services:
      dnsdist:
        image: 'tcely/dnsdist'
        restart: 'unless-stopped'
        tty: true
        stdin_open: true
        command: ["--disable-syslog", "--uid", "dnsdist", "--gid", "dnsdist", "--verbose"]
        volumes:
          - ./dnsdist.conf:/etc/dnsdist/dnsdist.conf:ro
        expose:
          - '53'
          - '53/udp'
        ports:
          - '53:53'
          - '53:53/udp'
      recursor:
        image: 'tcely/powerdns-recursor'
        restart: 'unless-stopped'
        command: ["--disable-syslog=yes", "--log-timestamp=no", "--local-address=0.0.0.0", "--setuid=pdns-recursor", "--setgid=pdns-recursor"]
        volumes:
          - ./pdns-recursor.conf:/etc/pdns-recursor/recursor.conf:ro
        expose:
          - '53'
          - '53/udp'

  ```
