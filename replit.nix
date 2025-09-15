{pkgs}: {
  deps = [
    pkgs.redis
    pkgs.nano
    pkgs.sshpass
    pkgs.inetutils
    pkgs.unixtools.ping
    pkgs.openssh
    pkgs.jq
    pkgs.sqlite
    pkgs.postgresql
    pkgs.procps
    pkgs.lsof
  ];
}
