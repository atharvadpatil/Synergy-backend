const grpc = require("@grpc/grpc-js");
const protoLoader = require("@grpc/proto-loader");

const packageDefinition = protoLoader.loadSync("auth.proto", {
  keepCase: true, 
  longs: String, 
  enums: String, 
  defaults: true, 
  oneofs: true,
});

const authProto = grpc.loadPackageDefinition(packageDefinition).auth;

const authClient = new authProto.AuthService("0.0.0.0:50051", grpc.credentials.createInsecure());

module.exports = authClient;