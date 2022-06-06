
REPO ?= slaclab/coact-ui
TAG ?= latest

build:
	docker build . -t $(REPO):$(TAG)

push:
	docker push $(REPO):$(TAG)

all: build push
