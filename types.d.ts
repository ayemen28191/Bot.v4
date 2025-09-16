// تعريفات الأنواع للحزم المفقودة
declare module 'better-sqlite3' {
  interface Database {
    prepare: (sql: string) => any;
    exec: (sql: string) => void;
    transaction: (fn: Function) => Function;
    pragma: (pragma: string, options?: { simple?: boolean }) => any;
    checkpoint: (mode?: string) => void;
    function: (name: string, fn: Function, options?: any) => void;
    aggregate: (name: string, options: any) => void;
    loadExtension: (path: string) => void;
    close: () => void;
    readonly open: boolean;
    readonly inTransaction: boolean;
    readonly name: string;
    readonly memory: boolean;
    readonly readonly: boolean;
  }

  export default function(filename: string, options?: any): Database;
}

declare module 'sqlite3' {
  export interface Database {
    run(sql: string, params: any[], callback?: (err: Error | null) => void): void;
    run(sql: string, callback?: (err: Error | null) => void): void;
    get(sql: string, params: any[], callback: (err: Error | null, row?: any) => void): void;
    get(sql: string, callback: (err: Error | null, row?: any) => void): void;
    all(sql: string, params: any[], callback: (err: Error | null, rows: any[]) => void): void;
    all(sql: string, callback: (err: Error | null, rows: any[]) => void): void;
    each(sql: string, params: any[], callback: (err: Error | null, row: any) => void, complete?: (err: Error | null, count: number) => void): void;
    each(sql: string, callback: (err: Error | null, row: any) => void, complete?: (err: Error | null, count: number) => void): void;
    exec(sql: string, callback?: (err: Error | null) => void): void;
    prepare(sql: string, params?: any[], callback?: (err: Error | null, stmt: Statement) => void): Statement;
    prepare(sql: string, callback?: (err: Error | null, stmt: Statement) => void): Statement;
    serialize(callback?: () => void): void;
    parallelize(callback?: () => void): void;
    close(callback?: (err: Error | null) => void): void;
    configure(option: string, value: any): void;
    on(event: string, listener: (...args: any[]) => void): this;
    interrupt(): void;
  }

  export interface Statement {
    bind(...params: any[]): Statement;
    reset(): Statement;
    finalize(callback?: (err: Error | null) => void): void;
    run(params?: any[], callback?: (err: Error | null) => void): void;
    run(callback?: (err: Error | null) => void): void;
    get(params?: any[], callback?: (err: Error | null, row?: any) => void): void;
    get(callback?: (err: Error | null, row?: any) => void): void;
    all(params?: any[], callback?: (err: Error | null, rows: any[]) => void): void;
    all(callback?: (err: Error | null, rows: any[]) => void): void;
    each(params: any[], callback: (err: Error | null, row: any) => void, complete?: (err: Error | null, count: number) => void): void;
    each(callback: (err: Error | null, row: any) => void, complete?: (err: Error | null, count: number) => void): void;
  }

  export function verbose(): any;
  
  export class Database {
    constructor(filename: string, mode?: number, callback?: (err: Error | null) => void);
    constructor(filename: string, callback?: (err: Error | null) => void);
    
    run(sql: string, params: any[], callback?: (err: Error | null) => void): void;
    run(sql: string, callback?: (err: Error | null) => void): void;
    get(sql: string, params: any[], callback: (err: Error | null, row?: any) => void): void;
    get(sql: string, callback: (err: Error | null, row?: any) => void): void;
    all(sql: string, params: any[], callback: (err: Error | null, rows: any[]) => void): void;
    all(sql: string, callback: (err: Error | null, rows: any[]) => void): void;
    each(sql: string, params: any[], callback: (err: Error | null, row: any) => void, complete?: (err: Error | null, count: number) => void): void;
    each(sql: string, callback: (err: Error | null, row: any) => void, complete?: (err: Error | null, count: number) => void): void;
    exec(sql: string, callback?: (err: Error | null) => void): void;
    prepare(sql: string, params?: any[], callback?: (err: Error | null, stmt: Statement) => void): Statement;
    prepare(sql: string, callback?: (err: Error | null, stmt: Statement) => void): Statement;
    serialize(callback?: () => void): void;
    parallelize(callback?: () => void): void;
    close(callback?: (err: Error | null) => void): void;
    configure(option: string, value: any): void;
    on(event: string, listener: (...args: any[]) => void): this;
    interrupt(): void;
  }

  export const OPEN_READONLY: number;
  export const OPEN_READWRITE: number;
  export const OPEN_CREATE: number;
  export const OPEN_FULLMUTEX: number;
  export const OPEN_SHAREDCACHE: number;
  export const OPEN_PRIVATECACHE: number;
  export const OPEN_URI: number;
}

declare module 'connect-sqlite3' {
  import session from 'express-session';
  
  interface SQLiteStoreOptions {
    db?: string;
    dir?: string;
    table?: string;
    concurrentDB?: boolean;
    ttl?: number;
  }
  
  export default function(session: typeof import('express-session')): {
    new(options?: SQLiteStoreOptions): session.Store;
  };
}

declare module 'geoip-lite' {
  interface GeoIpResult {
    range: [number, number];
    country: string;
    region: string;
    eu: "0" | "1";
    timezone: string;
    city: string;
    ll: [number, number];
    metro: number;
    area: number;
  }
  
  export function lookup(ip: string): GeoIpResult | null;
  export function startWatchingDataUpdate(): void;
  export function stopWatchingDataUpdate(): void;
}

declare module 'ssh2' {
  import { EventEmitter } from 'events';

  export interface ClientConfig {
    host: string;
    port?: number;
    username: string;
    password?: string;
    privateKey?: string | Buffer;
    readyTimeout?: number;
    tryKeyboard?: boolean;
    algorithms?: any;
    compress?: boolean;
    keepaliveInterval?: number;
    keepaliveCountMax?: number;
    debug?: (information: string) => void;
  }

  export interface SFTPStream extends EventEmitter {
    createReadStream(path: string, options?: any): NodeJS.ReadableStream;
    createWriteStream(path: string, options?: any): NodeJS.WritableStream;
    mkdir(path: string, attributes?: any, callback?: (err: any) => void): void;
    close(handle: Buffer, callback?: (err: any) => void): void;
    open(path: string, flags: string, attributes: any, callback: (err: any, handle: Buffer) => void): void;
    readFile(path: string, options?: any, callback?: (err: any, data: Buffer) => void): void;
    writeFile(path: string, data: Buffer, options?: any, callback?: (err: any) => void): void;
    readdir(path: string, callback: (err: any, list: any[]) => void): void;
    unlink(path: string, callback: (err: any) => void): void;
    rename(oldPath: string, newPath: string, callback: (err: any) => void): void;
    stat(path: string, callback: (err: any, stats: any) => void): void;
    lstat(path: string, callback: (err: any, stats: any) => void): void;
    chmod(path: string, mode: number | string, callback: (err: any) => void): void;
    fstat(handle: Buffer, callback: (err: any, stats: any) => void): void;
    end(): void;
  }

  export class Client extends EventEmitter {
    constructor();
    connect(config: ClientConfig): void;
    sftp(callback: (err: any, sftp: any) => void): void;
    exec(command: string, options: any, callback: (err: any, stream: any) => void): void;
    exec(command: string, callback: (err: any, stream: any) => void): void;
    end(): void;
  }
}