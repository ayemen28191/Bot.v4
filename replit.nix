{pkgs}: {
  deps = [
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
