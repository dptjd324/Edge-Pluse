# EdgePulse — Serverless Uptime Monitoring

## Project Overview

EdgePulse는 Cloudflare Workers 기반의 서버리스 **웹사이트 업타임 모니터링 서비스**이다.

사용자는 자신의 웹사이트 URL을 등록하고
시스템은 일정 주기로 상태를 확인하여 다음 정보를 기록한다.

* HTTP Status
* Response Time
* Availability
* Error message
* Timestamp

서비스는 다음 기능을 제공한다.

* 사이트 등록
* 상태 모니터링
* 장애 기록
* 상태 대시보드
* 공개 상태 페이지

---

# Project Goals

이 프로젝트의 목표

1. Cloudflare Workers 기반 서버리스 아키텍처 구현
2. Cloudflare D1 데이터베이스 사용
3. Cron 기반 자동 모니터링
4. GitHub 기반 자동 CI/CD
5. Codex CLI 기반 개발 자동화

---

# Target Users

* 개인 개발자
* 사이드 프로젝트 운영자
* 소규모 서비스 운영자

---

# Core Features

## Site Management

사용자는 모니터링할 사이트를 등록할 수 있다.

등록 정보

* name
* url
* slug
* check interval

---

## Monitoring

시스템은 일정 주기로 사이트 상태를 확인한다.

수집 데이터

* status
* status code
* response time
* error message

---

## Dashboard

사용자는 대시보드에서 다음 정보를 확인한다.

* 사이트 목록
* 현재 상태
* 최근 체크 결과
* 장애 발생 여부

---

## Public Status Page

각 사이트는 공개 상태 페이지를 가진다.

예시

/status/my-service

표시 정보

* 현재 상태
* 최근 체크
* uptime

---

# Non Functional Requirements

* 서버리스 아키텍처
* Edge runtime
* Cloudflare 배포
* 빠른 응답

---

# Tech Stack

Backend

* Cloudflare Workers
* Hono
* TypeScript

Database

* Cloudflare D1

Cache

* Cloudflare KV

Deployment

* Cloudflare Workers
* GitHub Actions

---

# Architecture

Client

↓

Cloudflare Worker API

↓

D1 Database

↓

KV Cache

---

# Success Criteria

프로젝트 성공 기준

* 사이트 등록 가능
* 상태 체크 가능
* 상태 기록 저장
* 공개 상태 페이지
* Cloudflare 배포 성공
