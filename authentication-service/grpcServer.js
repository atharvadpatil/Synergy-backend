const grpc = require("@grpc/grpc-js");
const protoLoader = require("@grpc/proto-loader");
const User = require("./models/User");

const packageDefinition = protoLoader.loadSync("auth.proto", { 
  keepCase: true, 
  longs: String, 
  enums: String, 
  defaults: true, 
  oneofs: true 
});

const authProto = grpc.loadPackageDefinition(packageDefinition).auth;

const server = new grpc.Server();

server.addService(authProto.AuthService.service, {  
  GetUserByEmail: async (req, res) => {
    try {
      const { email } = req.request;
      const user = await User.findOne({ email });

      if (!user) return res(null, { userId: "", userName: "", userEmail: "", userAvatar: "" });  

      res(null, { 
        userId: user.id,
        userName: user.name, 
        userEmail: user.email, 
        userAvatar: user.avatar
      });
    } catch (error) {
      res(error, null);
    }
  }
});

module.exports = server;