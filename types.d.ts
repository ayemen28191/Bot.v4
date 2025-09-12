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

declare module 'connect-sqlite3' {
  import session from 'express-session';
  
  export default function(session: typeof import('express-session')): {
    new(options?: any): session.Store;
  };
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