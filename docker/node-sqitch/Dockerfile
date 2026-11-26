ARG BASE=node
ARG BASE_VERSION=22-bookworm
FROM ${BASE}:${BASE_VERSION} AS sqitch-build

LABEL org.opencontainers.image.source="https://github.com/constructive-io/constructive"

# Install system dependencies.
WORKDIR /work
ARG VERSION=1.1.0
RUN mkdir -p /usr/share/man/man1 /usr/share/man/man7 \
    && apt-get update \
    && apt-get install -y --no-install-recommends \
        build-essential \
        ca-certificates \
        curl \
        gnupg \
        libdbd-pg-perl \
        libperl-dev \
        libpq-dev \
        perl \
        tzdata \
    && rm -rf /var/lib/apt/lists/* \
    && curl -LO https://www.cpan.org/authors/id/D/DW/DWHEELER/App-Sqitch-v$VERSION.tar.gz \
    && mkdir src \
    && tar -zxf App-Sqitch-v$VERSION.tar.gz --strip-components 1 -C src

# Install cpan and build dependencies.
ENV PERL5LIB=/work/local/lib/perl5
RUN curl -sL --compressed https://git.io/cpm > cpm && chmod +x cpm \
    && ./cpm install -L local --verbose --no-test ExtUtils::MakeMaker \
    && ./cpm install -L local --verbose --no-test --with-recommends \
        --with-configure --without-develop --cpanfile src/dist/cpanfile

ENV TZ=UTC
RUN ln -snf /usr/share/zoneinfo/UTC /etc/localtime \
    && echo UTC > /etc/timezone

# Build, test, bundle, prune.
WORKDIR /work/src

RUN perl Build.PL --quiet --install_base /app --etcdir /etc/sqitch \
    --config installman1dir= --config installsiteman1dir= --config installman3dir= --config installsiteman3dir= \
    --with postgres \
    && ln -s  /usr/include/ibase.h \
    # && ./Build test
    && ./Build bundle \
    && rm -rf /app/man \
    && find /app -name '*.pod' | grep -v sqitch | xargs rm -rf

################################################################################
# Copy to the final image without all the build stuff.

ARG BASE=node
ARG BASE_VERSION=22-bookworm
FROM ${BASE}:${BASE_VERSION} AS sqitch

LABEL org.opencontainers.image.source="https://github.com/constructive-io/constructive"

# Install runtime system dependencies and remove unnecesary files.
RUN mkdir -p /usr/share/man/man1 /usr/share/man/man7 \
    && apt-get update \
    && apt-get install -y --no-install-recommends \
        bash \
        ca-certificates \
        g++ \
        git \
        less \
        libdbd-pg-perl \
        make \
        perl \
        postgresql-client \
        python3-dev \
        vim-tiny \
    && mkdir -p /etc/pki/tls && ln -s /etc/ssl/certs /etc/pki/tls/ \
    && rm -rf /var/cache/apt/* /var/lib/apt/lists/* /usr/bin/mysql?* \
    && rm -rf /plibs /man /usr/share/man /usr/share/doc /usr/share/postgresql \
        /usr/share/nano /etc/nanorc \
    && find / -name '*.pod' | grep -v sqitch | xargs rm -rf

# Copy the app and config from the build image.
COPY --from=sqitch-build /app /opt/sqitch/
COPY --from=sqitch-build /etc/sqitch /etc/sqitch/
COPY --from=sqitch-build /etc/localtime /etc/localtime
COPY --from=sqitch-build /etc/timezone /etc/timezone

# Set up environment, entrypoint, and default command.
ENV PATH=/opt/sqitch/bin:$PATH PERL5LIB=/opt/sqitch/lib/perl5
ENV LESS=-R LC_ALL=C.UTF-8 LANG=C.UTF-8 SQITCH_EDITOR=vi SQITCH_PAGER=less

ENTRYPOINT ["/bin/sh"]
