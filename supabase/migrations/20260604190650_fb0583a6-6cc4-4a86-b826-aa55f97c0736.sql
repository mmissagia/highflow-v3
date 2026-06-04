
DO $$
DECLARE
  uid uuid := '776ecd4b-b4f0-46c4-8b6b-c57f606e9876';
  sdr1 uuid; sdr2 uuid; closer1 uuid; closer2 uuid; closer3 uuid;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.sales_users WHERE user_id = uid) THEN
    INSERT INTO public.sales_users (user_id, name, role, email, phone, status, monthly_goal_value, commission_type, commission_percent, commission_fixed_value, cost_fixed_monthly) VALUES
      (uid,'Ana Souza','SDR','ana.souza@highflow.com','11991110001','active',50000,'percent',3.5,0,0),
      (uid,'Carlos Lima','CLOSER','carlos.lima@highflow.com','11991110002','active',150000,'percent',8.0,0,0),
      (uid,'Fernanda Costa','CLOSER','fernanda.costa@highflow.com','11991110003','active',120000,'percent',7.5,0,0),
      (uid,'Ricardo Mendes','SDR','ricardo.mendes@highflow.com','11991110004','active',40000,'percent',3.0,0,0),
      (uid,'Juliana Teixeira','CLOSER','juliana.t@highflow.com','11991110005','active',100000,'percent',5.0,0,0),
      (uid,'Bruno Alves','SDR','bruno.alves@highflow.com','11991110006','inactive',30000,'fixed',0,2500,0);
  END IF;

  SELECT id INTO sdr1    FROM public.sales_users WHERE user_id=uid AND name='Ana Souza';
  SELECT id INTO sdr2    FROM public.sales_users WHERE user_id=uid AND name='Ricardo Mendes';
  SELECT id INTO closer1 FROM public.sales_users WHERE user_id=uid AND name='Carlos Lima';
  SELECT id INTO closer2 FROM public.sales_users WHERE user_id=uid AND name='Fernanda Costa';
  SELECT id INTO closer3 FROM public.sales_users WHERE user_id=uid AND name='Juliana Teixeira';

  IF NOT EXISTS (SELECT 1 FROM public.deals WHERE user_id = uid) THEN
    INSERT INTO public.deals (user_id, lead_id, product_id, amount_value, closer_id, sdr_id, notes, won_at, stage) VALUES
      (uid,'lead-5','mentoria-elite',15000,closer1,sdr1,'Lead indicado por ex-aluno. Fechou na primeira reunião.', now() - interval '5 days','won'),
      (uid,'lead-4','mastermind-anual',24000,closer2,sdr2,'Maior deal do mês. Lead qualificado via Instagram.', now() - interval '10 days','won'),
      (uid,'lead-2','imersao-presencial',12000,closer1,sdr1,'Objeção de agenda. Follow-up agendado para sexta.', NULL,'open'),
      (uid,'lead-1','mentoria-elite',18000,closer1,sdr1,'Lead muito quente. Score 85. Proposta enviada.', NULL,'open'),
      (uid,'lead-3','imersao-presencial',8500,closer2,sdr2,'Objeção de preço. Considerar boleto TMB.', NULL,'open'),
      (uid,'lead-1','mastermind-anual',24000,closer3,sdr2,'Indicação do Rafael Mendonça. Alta receptividade.', NULL,'open');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.sales_activities WHERE user_id = uid) THEN
    INSERT INTO public.sales_activities (user_id, lead_id, sales_user_id, activity_type, occurred_at, status, outcome, next_step) VALUES
      (uid,'lead-1',sdr1,'CALL', now() - interval '2 days','done','Confirmou orçamento acima de R$ 15k. Alta receptividade.','Agendar reunião com Closer'),
      (uid,'lead-2',closer1,'MEETING_DONE', now() - interval '3 days','done','Reunião de diagnóstico. Objeção de agenda identificada.','Enviar proposta personalizada'),
      (uid,'lead-4',sdr1,'WHATSAPP', now() - interval '1 day','done','Sequência WhatsApp — 3 mensagens. Taxa de resposta: 100%.','Aguardar retorno'),
      (uid,'lead-3',closer1,'CALL', now() - interval '4 days','done','Follow-up pós-proposta. Objeção de prazo.','Ligar em 7 dias'),
      (uid,'lead-5',closer2,'MEETING_DONE', now() - interval '5 days','done','Pitch presencial. Proposta de R$ 15k.','Aguardar assinatura'),
      (uid,'lead-2',sdr2,'CALL', now() - interval '6 hours','done','Primeiro contato — indicação do Rafael.','Preparar diagnóstico'),
      (uid,'lead-1',sdr1,'WHATSAPP', now() - interval '7 days','done','E-mail de nurturing sobre ROI.','Monitorar engajamento'),
      (uid,'lead-3',closer2,'PROPOSAL_SENT', now() - interval '4 days','done','Proposta enviada por e-mail.','Aguardar feedback'),
      (uid,'lead-5',closer2,'DEAL_WON', now() - interval '5 days','done','Fechamento confirmado.','Iniciar onboarding'),
      (uid,'lead-4',closer2,'DEAL_WON', now() - interval '10 days','done','Fechamento confirmado.','Iniciar onboarding'),
      (uid,'lead-1',closer1,'MEETING_SCHEDULED', now() + interval '1 day','planned','Reunião agendada para amanhã.','Confirmar presença'),
      (uid,'lead-3',closer2,'FOLLOW_UP', now() + interval '2 days','planned','Follow-up programado.','Ligar pela manhã');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.commission_records WHERE user_id = uid) THEN
    INSERT INTO public.commission_records (user_id, deal_id, sales_user_id, commission_value, status, period_month)
    SELECT uid, d.id, d.closer_id, d.amount_value * 0.08, 'paid', to_char(now(),'YYYY-MM')
      FROM public.deals d
     WHERE d.user_id = uid AND d.stage = 'won';
  END IF;
END $$;
