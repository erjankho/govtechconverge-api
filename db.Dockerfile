FROM postgres:16.4-bookworm

RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        build-essential \
        ca-certificates \
        flex \
        git \
        postgresql-server-dev-16 && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /tmp
RUN git clone --depth 1 --branch v0.7.4 https://github.com/pgvector/pgvector.git

WORKDIR /tmp/pgvector
RUN make
RUN make install
