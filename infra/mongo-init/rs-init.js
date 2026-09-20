/**
 * MongoDB replica set initialisation script.
 * Runs once inside the mongo container at first startup.
 * The healthcheck also calls rs.initiate() idempotently, so this script
 * is a belt-and-suspenders fallback for environments where the healthcheck
 * fires before mongod is fully ready.
 */

try {
  const status = rs.status();
  print("Replica set already initialised, state:", status.myState);
} catch (_) {
  print("Initiating replica set rs0 ...");
  const result = rs.initiate({
    _id: "rs0",
    members: [{ _id: 0, host: "mongo:27017" }],
  });
  printjson(result);
}
