# Flash Sale API / Stock Contention

A high-throughput, concurrency-safe **flash sale backend system** built with **Node.js**, **Redis**, and **Lua scripting**, designed to handle stock reservation, contention, and per-customer limits under extreme load. Perfect for demonstrating distributed system patterns, atomic operations, and race-condition handling.

---

## Features

* **Atomic Stock Reservation**:
  Redis + Lua ensures counters (`available`, `reserved`, `sold`) are updated **atomically**, preventing oversell under high concurrency.

* **Idempotent Reservation**:
  Duplicate or retry requests are safely ignored using `ZADD NX` in Lua.

* **Customer Quota Enforcement**:
  Each customer can reserve a configurable **max quantity** per sale (e.g., 2 units).

* **Reservation TTL & Reaper**:
  Expired reservations are automatically reclaimed using a background reaper process, releasing stock back safely.

* **High Concurrency & Stress-Tested**:
  Supports hundreds of concurrent reservations without race conditions or stock drift.

* **Atomic Expiry & Counter Safety**:
  Lua scripts ensure that customer counters, stock, and reservation ZSETs remain consistent, even under concurrent expirations.

---

## Tech Stack

* **Node.js / TypeScript** – Backend
* **Fastify - Server
* **ioredis** – Redis client for Node.js
* **Redis** – Primary datastore for stock, reservations, and per-customer counters
* **Lua scripting** – Atomic operations on stock & reservations
* **Promise.all / Async** – Concurrency simulation

---

## Architecture

```
                     ┌─────────────────────────┐
                     │   Client Requests       │
                     └───────────┬─────────────┘
                                 │ Reserve Stock
                                 ▼
                     ┌─────────────────────────┐
                     │  Node.js / API Layer    │
                     └───────────┬─────────────┘
                                 │
                                 ▼
                  ┌─────────────────────────────┐
                  │ Redis + Lua Atomic Scripts  │
                  │ - Stock Hash (available,    │
                  │   reserved, sold)           │
                  │ - Reservations ZSET         │
                  │ - Customer counters         │
                  └───────────┬─────────────────┘
                              │
          ┌───────────────────┴────────────────────┐
          │ Reaper Process (TTL cleanup)           │
          │ - Expired reservations removed         │
          │ - Counters decremented safely          │
          └───────────────────────────────────────┘
```

---

## Key Redis Keys

| Key Pattern                            | Type   | Purpose                                |
| -------------------------------------- | ------ | -------------------------------------- |
| `flashsale:{saleId}:stock`             | HASH   | Tracks `available`, `reserved`, `sold` |
| `flashsale:{saleId}:reservations`      | ZSET   | Active reservations with TTL           |
| `flashsale:{saleId}:cust:{customerId}` | STRING | Per-customer reserved quantity         |

---

## Lua Scripts

* **reserveStock.lua** – Atomic reservation with:

  * Idempotency (`ZADD NX`)
  * Stock check
  * Customer quota check
* **releaseStock.lua** – Atomic expiry release:

  * Return stock to available
  * Decrement customer counters
  * Remove expired reservation from ZSET

---

## Usage

1. **Install dependencies**

```bash
npm install
```

2. **Run the Node.js test harness**

```bash
docker compose up --build

npm run dev


```
* http://127.0.0.1:8500/init-stock -- initialize the stock
* http://127.0.0.1:8500/reserve -- place 100 reservations concurrently

* Demonstrates **atomic reservation**, **customer quota**, and **expiration**.
* Simulates high-concurrency scenarios.

---

## Test Harness

* Supports **100+ concurrent reservations**
* Simulates **duplicate reservations**
* Includes **TTL expiration / reaper logic**
* Validates **invariants**:

  * `available >= 0`
  * `reserved` matches ZSET count
  * Customer quota enforced

---

## Configuration

* `MAX_PER_CUSTOMER` – Max items per customer per sale
* `TTL_MS` – Reservation time-to-live
* `REAP_INTERVAL_MS` – Background reaper interval
* `TOTAL_STOCK` – Initial stock quantity




