#!/bin/bash
while true; do
  machine_ids=("4d891d12b6d038" "4d89151f24e387")  # Replace with desired machine IDs

  for machine_id in "${machine_ids[@]}"; do
    status=$(flyctl machine status "$machine_id" -a ticketapi-db | awk '/State/{print $3}')
    echo machine $machine_id status: $status
    if [ $status == "stopped" ]; then
      flyctl machine start "$machine_id" -a ticketapi-db
      echo "Machine $machine_id started successfully"
    else
      echo "Machine $machine_id is already running"
    fi
  done
  sleep 1m  # Wait for 1 minute before checking again
done
