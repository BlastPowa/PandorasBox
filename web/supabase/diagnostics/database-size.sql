-- READ ONLY: run in Supabase SQL Editor. Does not delete or change any data.
select pg_size_pretty(pg_database_size(current_database())) as database_size;
show default_transaction_read_only;
select schemaname, relname as table_name,
       pg_size_pretty(pg_total_relation_size(relid)) as total_size,
       pg_size_pretty(pg_relation_size(relid)) as data_size,
       pg_size_pretty(pg_indexes_size(relid)) as index_size,
       n_live_tup as estimated_rows, n_dead_tup as estimated_dead_rows,
       n_tup_ins as inserts_since_stats_reset, n_tup_upd as updates_since_stats_reset,
       last_autovacuum, last_autoanalyze
from pg_stat_user_tables
order by pg_total_relation_size(relid) desc
limit 25;

-- Statistics are cumulative since this reset time, not a monthly usage counter.
select stats_reset from pg_stat_database where datname = current_database();
