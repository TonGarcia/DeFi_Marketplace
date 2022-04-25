FROM ubuntu:jammy

RUN apt-get update
RUN apt-get -y install libdigest-sha-perl
RUN apt-get -y install nodejs npm python3 wget
RUN apt-get -y install perl make
RUN apt -y install libudev-dev
#RUN npm install -g node@12.9.1
RUN npm install --global yarn

RUN wget https://github.com/ethereum/solidity/releases/download/v0.5.16/solc-static-linux -O /bin/solc && chmod +x /bin/solc

RUN mkdir -p /protocol
WORKDIR /protocol

# First add deps
ADD ./package.json /protocol
ADD ./yarn.lock /protocol
RUN yarn install --lock-file

# Then rest of code and build
ADD . /protocol

ENV SADDLE_SHELL=/bin/sh
ENV SADDLE_CONTRACTS="contracts/*.sol contracts/**/*.sol"
RUN npx saddle compile
RUN yarn cache clean
RUN chmod u+x /protocol/set_permissions.sh
RUN /protocol/set_permissions.sh

CMD while :; do sleep 2073600; done